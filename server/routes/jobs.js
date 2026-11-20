
const express = require("express");
const db = require("../config/db");
const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/auth");

const router = express.Router();

// VIEW ALL JOBS
router.get("/", authenticateToken, async (req, res) => {
    try {
        const [jobs] = await db.execute(
            `SELECT j.*, u.name AS alumni_name
             FROM jobs j
             JOIN users u ON u.id = j.alumni_id
             WHERE u.status = 'approved'
             ORDER BY j.created_at DESC`
        );

        res.json({ success: true, jobs });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Unable to load jobs."
        });
    }
});

// POST JOB - APPROVED ALUMNI ONLY
router.post(
    "/",
    authenticateToken,
    authorizeRoles("alumni"),
    async (req, res) => {
        const { title, company, location, description, application_link } =
            req.body;

        if (!title || !company) {
            return res.status(400).json({
                success: false,
                message: "Job title and company are required."
            });
        }

        try {
            const [users] = await db.execute(
                "SELECT status FROM users WHERE id = ?",
                [req.user.id]
            );

            if (!users.length || users[0].status !== "approved") {
                return res.status(403).json({
                    success: false,
                    message: "Only approved alumni can post jobs."
                });
            }

            const [result] = await db.execute(
                `INSERT INTO jobs
                 (alumni_id, title, company, location, description, application_link)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    req.user.id,
                    title.trim(),
                    company.trim(),
                    location || null,
                    description || null,
                    application_link || null
                ]
            );

            res.status(201).json({
                success: true,
                message: "Job posted successfully.",
                jobId: result.insertId
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({
                success: false,
                message: "Unable to post job."
            });
        }
    }
);

// DELETE JOB - OWNER OR ADMIN
router.delete("/:id", authenticateToken, async (req, res) => {
    try {
        let query = "DELETE FROM jobs WHERE id = ?";
        let params = [req.params.id];

        if (req.user.role !== "admin") {
            query += " AND alumni_id = ?";
            params.push(req.user.id);
        }

        const [result] = await db.execute(query, params);

        if (!result.affectedRows) {
            return res.status(404).json({
                success: false,
                message: "Job not found or permission denied."
            });
        }

        res.json({
            success: true,
            message: "Job deleted successfully."
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Unable to delete job."
        });
    }
});

module.exports = router;
