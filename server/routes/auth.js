
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const router = express.Router();

// ==========================================
// REGISTER
// POST /api/auth/register
// STUDENT AND ALUMNI
// Both accounts are approved immediately
// ==========================================

router.post("/register", async (req, res) => {
    const {
        name,
        email,
        password,
        role,

        // Student details
        phone,
        course,
        semester,
        department,
        study_year,

        // Alumni details
        college,
        graduation_year,
        company,
        designation
    } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({
            success: false,
            message: "Name, email, password and role are required."
        });
    }

    const normalizedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedRole = String(role).trim().toLowerCase();

    if (!["student", "alumni"].includes(normalizedRole)) {
        return res.status(400).json({
            success: false,
            message: "Only student and alumni registration is allowed."
        });
    }

    if (normalizedName.length < 2) {
        return res.status(400).json({
            success: false,
            message: "Please enter a valid name."
        });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res.status(400).json({
            success: false,
            message: "Please enter a valid email address."
        });
    }

    if (String(password).length < 8) {
        return res.status(400).json({
            success: false,
            message: "Password must contain at least 8 characters."
        });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Check existing account
        const [existingUsers] = await connection.execute(
            "SELECT id FROM users WHERE email = ?",
            [normalizedEmail]
        );

        if (existingUsers.length > 0) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(
            password,
            12
        );

        // IMPORTANT:
        // Both students and alumni are approved immediately.
        const [result] = await connection.execute(
            `INSERT INTO users
             (name, email, password, role, status)
             VALUES (?, ?, ?, ?, 'approved')`,
            [
                normalizedName,
                normalizedEmail,
                hashedPassword,
                normalizedRole
            ]
        );

        const userId = result.insertId;

        // ======================================
        // STUDENT PROFILE
        // ======================================

        if (normalizedRole === "student") {
            await connection.execute(
                `INSERT INTO student_profiles
                 (
                    user_id,
                    phone,
                    course,
                    semester,
                    department,
                    study_year
                 )
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    phone || null,
                    course || null,
                    semester || null,
                    department || null,
                    study_year || null
                ]
            );
        }

        // ======================================
        // ALUMNI PROFILE
        // ======================================

        if (normalizedRole === "alumni") {
            await connection.execute(
                `INSERT INTO alumni_profiles
                 (
                    user_id,
                    college,
                    graduation_year,
                    department,
                    company,
                    designation
                 )
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    college || null,
                    graduation_year || null,
                    department || null,
                    company || null,
                    designation || null
                ]
            );
        }

        await connection.commit();

        // Generate login token immediately
        const token = jwt.sign(
            {
                id: userId,
                email: normalizedEmail,
                role: normalizedRole
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        return res.status(201).json({
            success: true,
            message: "Registration successful! Your account is ready.",
            token,
            user: {
                id: userId,
                name: normalizedName,
                email: normalizedEmail,
                role: normalizedRole,
                status: "approved"
            }
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("REGISTRATION ERROR:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Registration failed. Please try again."
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});


// ==========================================
// LOGIN
// POST /api/auth/login
// ==========================================

router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required."
        });
    }

    try {
        const normalizedEmail = String(email).trim().toLowerCase();

        const [users] = await db.execute(
            `SELECT
                id,
                name,
                email,
                password,
                role,
                status
             FROM users
             WHERE email = ?`,
            [normalizedEmail]
        );

        if (!users.length) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const user = users[0];

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // Blocked accounts cannot log in.
        if (user.status === "blocked") {
            return res.status(403).json({
                success: false,
                message: "Your account has been blocked. Contact the administrator."
            });
        }

        // No pending approval check.
        // Student and alumni accounts can log in immediately.

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        return res.json({
            success: true,
            message: "Login successful.",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status
            }
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to log in. Please try again."
        });
    }
});


module.exports = router;
