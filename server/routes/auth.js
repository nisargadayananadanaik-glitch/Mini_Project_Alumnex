
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const router = express.Router();

// STUDENT / ALUMNI REGISTRATION
router.post("/register", async (req, res) => {
    let connection;

    try {
        const {
            name,
            email,
            password,
            role,
            department,
            study_year,
            graduation_year,
            company,
            designation
        } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all required fields."
            });
        }

        if (!["student", "alumni"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid registration role."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const [existing] = await db.execute(
            "SELECT id FROM users WHERE email = ?",
            [normalizedEmail]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: "This email is already registered. Please login."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        connection = await db.getConnection();
        await connection.beginTransaction();

        const accountStatus =
            role === "student" ? "approved" : "pending";

        const [userResult] = await connection.execute(
            `INSERT INTO users
            (name, email, password, role, status)
            VALUES (?, ?, ?, ?, ?)`,
            [
                name.trim(),
                normalizedEmail,
                hashedPassword,
                role,
                accountStatus
            ]
        );

        const userId = userResult.insertId;

        if (role === "student") {
            await connection.execute(
                `INSERT INTO student_profiles
                (user_id, department, study_year, career_interest)
                VALUES (?, ?, ?, ?)`,
                [
                    userId,
                    department || null,
                    study_year || null,
                    null
                ]
            );
        }

        if (role === "alumni") {
            await connection.execute(
                `INSERT INTO alumni_profiles
                (user_id, graduation_year, department, company, designation)
                VALUES (?, ?, ?, ?, ?)`,
                [
                    userId,
                    graduation_year || null,
                    department || null,
                    company || null,
                    designation || null
                ]
            );
        }

        await connection.commit();

        return res.status(201).json({
            success: true,
            message: role === "student"
                ? "Student registration successful! You can now login."
                : "Alumni registration successful! Please wait for admin verification."
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("REGISTRATION ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Registration failed. Please try again."
        });

    } finally {
        if (connection) connection.release();
    }
});


// USER LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const [users] = await db.execute(
            "SELECT * FROM users WHERE email = ?",
            [normalizedEmail]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Account not found. Please register first."
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
                message: "Incorrect email or password."
            });
        }

        if (user.status === "blocked") {
            return res.status(403).json({
                success: false,
                message: "Your account has been blocked. Contact administration."
            });
        }

        if (user.status === "pending") {
            return res.status(403).json({
                success: false,
                message: "Your alumni account is awaiting admin verification."
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful!",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Login failed. Please try again."
        });
    }
});

module.exports = router;
