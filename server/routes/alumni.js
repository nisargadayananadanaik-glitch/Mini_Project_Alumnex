
const express = require("express");
const db = require("../config/db");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/auth");

const router = express.Router();

// Alumni can browse approved student profiles without exposing contact details.
router.get("/students", authenticateToken, authorizeRoles("alumni"), async (req, res) => {
    try {
        const search = String(req.query.search || "").trim();
        const pattern = `%${search}%`;

        const [students] = await db.execute(
            `SELECT
                u.id,
                u.name,
                p.department,
                p.course,
                p.study_year,
                p.semester
             FROM users u
             JOIN student_profiles p
                ON u.id = p.user_id
             WHERE u.role = 'student'
                AND u.status = 'approved'
                AND (
                    u.name LIKE ?
                    OR p.department LIKE ?
                    OR p.course LIKE ?
                )
             ORDER BY u.name ASC`,
            [pattern, pattern, pattern]
        );

        return res.json({
            success: true,
            count: students.length,
            students
        });
    } catch (error) {
        console.error("STUDENT DIRECTORY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load student profiles."
        });
    }
});

// Search approved alumni
router.get("/", authenticateToken, async (req, res) => {
    try {
        const search = req.query.search || "";

        const [alumni] = await db.execute(
            `SELECT
                u.id,
                u.name,
                u.email,
                p.department,
                p.graduation_year,
                p.company,
                p.designation
             FROM users u
             JOIN alumni_profiles p
                ON u.id = p.user_id
             WHERE u.role = 'alumni'
                AND u.status = 'approved'
                AND (
                    u.name LIKE ?
                    OR p.company LIKE ?
                    OR p.department LIKE ?
                )
             ORDER BY u.name ASC`,
            [
                `%${search}%`,
                `%${search}%`,
                `%${search}%`
            ]
        );

        res.json({
            success: true,
            count: alumni.length,
            alumni
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to load alumni."
        });
    }
});

module.exports = router;
