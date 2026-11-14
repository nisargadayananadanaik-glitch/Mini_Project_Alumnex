
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        if (!["student", "alumni"].includes(role)) {
            return res.status(400).json({
                message: "Invalid registration role"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must contain at least 8 characters"
            });
        }

        const [existing] = await db.execute(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existing.length) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const status = role === "alumni" ? "pending" : "approved";

        const [result] = await db.execute(
            `INSERT INTO users
            (name,email,password,role,status)
            VALUES (?,?,?,?,?)`,
            [name, email, hashedPassword, role, status]
        );

        if (role === "alumni") {
            await db.execute(
                "INSERT INTO alumni_profiles (user_id) VALUES (?)",
                [result.insertId]
            );
        } else {
            await db.execute(
                "INSERT INTO student_profiles (user_id) VALUES (?)",
                [result.insertId]
            );
        }

        res.status(201).json({
            message: role === "alumni"
                ? "Registration successful. Awaiting verification."
                : "Registration successful. You can log in.",
            status
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Registration failed"
        });
    }
});

// LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const [users] = await db.execute(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (!users.length) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = users[0];

        const valid = await bcrypt.compare(
            password,
            user.password
        );

        if (!valid) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        if (user.status === "blocked") {
            return res.status(403).json({
                message: "Account blocked"
            });
        }

        if (user.status === "pending") {
            return res.status(403).json({
                message: "Your alumni account is awaiting verification"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Login failed"
        });
    }
});

module.exports = router;
