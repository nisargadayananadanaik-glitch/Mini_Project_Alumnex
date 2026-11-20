
const express = require("express");
const db = require("../config/db");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// GET PROFILE
router.get("/profile", authenticateToken, async (req, res) => {
    try {
        const [users] = await db.execute(
            `SELECT id, name, email, role, status, created_at
             FROM users
             WHERE id = ?`,
            [req.user.id]
        );

        if (!users.length) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const user = users[0];
        let profile = {};

        // STUDENT PROFILE
        if (user.role === "student") {
            const [rows] = await db.execute(
                `SELECT phone, department, course, study_year,
                        semester, career_interest
                 FROM student_profiles
                 WHERE user_id = ?`,
                [user.id]
            );

            profile = rows[0] || {};
        }

        // ALUMNI PROFILE
        else if (user.role === "alumni") {
            const [rows] = await db.execute(
                `SELECT college, graduation_year, department,
                        company, designation
                 FROM alumni_profiles
                 WHERE user_id = ?`,
                [user.id]
            );

            profile = rows[0] || {};
        }

        return res.json({
            success: true,
            user: {
                ...user,
                profile
            }
        });

    } catch (error) {
        console.error("GET PROFILE ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load profile."
        });
    }
});


// UPDATE PROFILE
router.put("/profile", authenticateToken, async (req, res) => {
    const {
        name,
        phone,
        department,
        course,
        study_year,
        semester,
        career_interest,
        college,
        graduation_year,
        company,
        designation
    } = req.body;

    let connection;

    try {
        connection = await db.getConnection();

        await connection.beginTransaction();

        // UPDATE USER NAME
        if (name !== undefined) {
            if (!String(name).trim()) {
                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message: "Name cannot be empty."
                });
            }

            await connection.execute(
                `UPDATE users
                 SET name = ?
                 WHERE id = ?`,
                [String(name).trim(), req.user.id]
            );
        }

        // UPDATE STUDENT PROFILE
        if (req.user.role === "student") {
            await connection.execute(
                `UPDATE student_profiles
                 SET phone = COALESCE(?, phone),
                     department = COALESCE(?, department),
                     course = COALESCE(?, course),
                     study_year = COALESCE(?, study_year),
                     semester = COALESCE(?, semester),
                     career_interest = COALESCE(?, career_interest)
                 WHERE user_id = ?`,
                [
                    phone ?? null,
                    department ?? null,
                    course ?? null,
                    study_year ?? null,
                    semester ?? null,
                    career_interest ?? null,
                    req.user.id
                ]
            );
        }

        // UPDATE ALUMNI PROFILE
        else if (req.user.role === "alumni") {
            await connection.execute(
                `UPDATE alumni_profiles
                 SET college = COALESCE(?, college),
                     department = COALESCE(?, department),
                     graduation_year = COALESCE(?, graduation_year),
                     company = COALESCE(?, company),
                     designation = COALESCE(?, designation)
                 WHERE user_id = ?`,
                [
                    college ?? null,
                    department ?? null,
                    graduation_year ?? null,
                    company ?? null,
                    designation ?? null,
                    req.user.id
                ]
            );
        }

        else {
            await connection.rollback();

            return res.status(403).json({
                success: false,
                message: "Profile editing is not available for this role."
            });
        }

        await connection.commit();

        return res.json({
            success: true,
            message: "Profile updated successfully."
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("UPDATE PROFILE ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update profile."
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});

module.exports = router;
