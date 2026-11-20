
const express = require("express");
const db = require("../config/db");
const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/auth");

const router = express.Router();

// STUDENT SENDS REQUEST
router.post(
    "/",
    authenticateToken,
    authorizeRoles("student"),
    async (req, res) => {
        const { alumni_id, message } = req.body;

        if (!alumni_id) {
            return res.status(400).json({
                success: false,
                message: "Please select an alumnus."
            });
        }

        try {
            const [alumni] = await db.execute(
                `SELECT id FROM users
                 WHERE id = ? AND role = 'alumni'
                 AND status = 'approved'`,
                [alumni_id]
            );

            if (!alumni.length) {
                return res.status(404).json({
                    success: false,
                    message: "Approved alumni member not found."
                });
            }

            const [existing] = await db.execute(
                `SELECT id FROM mentorship
                 WHERE student_id = ? AND alumni_id = ?
                 AND status = 'pending'`,
                [req.user.id, alumni_id]
            );

            if (existing.length) {
                return res.status(409).json({
                    success: false,
                    message: "A pending request already exists."
                });
            }

            const [result] = await db.execute(
                `INSERT INTO mentorship
                 (student_id, alumni_id, message)
                 VALUES (?, ?, ?)`,
                [req.user.id, alumni_id, message || null]
            );

            await db.execute(
                `INSERT INTO notifications
                 (user_id, title, message)
                 VALUES (?, ?, ?)`,
                [
                    alumni_id,
                    "New mentorship request",
                    "A student has requested your mentorship."
                ]
            );

            res.status(201).json({
                success: true,
                message: "Mentorship request sent.",
                requestId: result.insertId
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({
                success: false,
                message: "Unable to send mentorship request."
            });
        }
    }
);

// VIEW REQUESTS
router.get("/", authenticateToken, async (req, res) => {
    try {
        let query;
        let params = [];

        if (req.user.role === "student") {
            query = `
                SELECT m.*, u.name AS alumni_name
                FROM mentorship m
                JOIN users u ON u.id = m.alumni_id
                WHERE m.student_id = ?
                ORDER BY m.created_at DESC
            `;
            params = [req.user.id];

        } else if (req.user.role === "alumni") {
            query = `
                SELECT m.*, u.name AS student_name
                FROM mentorship m
                JOIN users u ON u.id = m.student_id
                WHERE m.alumni_id = ?
                ORDER BY m.created_at DESC
            `;
            params = [req.user.id];

        } else if (req.user.role === "admin") {
            query = `
                SELECT m.*,
                       s.name AS student_name,
                       a.name AS alumni_name
                FROM mentorship m
                JOIN users s ON s.id = m.student_id
                JOIN users a ON a.id = m.alumni_id
                ORDER BY m.created_at DESC
            `;
        } else {
            return res.status(403).json({
                success: false,
                message: "Permission denied."
            });
        }

        const [requests] = await db.execute(query, params);

        res.json({ success: true, requests });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Unable to load mentorship requests."
        });
    }
});

// ALUMNI ACCEPT OR REJECT
router.patch(
    "/:id",
    authenticateToken,
    authorizeRoles("alumni"),
    async (req, res) => {
        const { status } = req.body;

        if (!["accepted", "rejected"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid request status."
            });
        }

        try {
            const [result] = await db.execute(
                `UPDATE mentorship
                 SET status = ?
                 WHERE id = ? AND alumni_id = ? AND status = 'pending'`,
                [status, req.params.id, req.user.id]
            );

            if (!result.affectedRows) {
                return res.status(404).json({
                    success: false,
                    message: "Pending mentorship request not found."
                });
            }

            const [rows] = await db.execute(
                "SELECT student_id FROM mentorship WHERE id = ?",
                [req.params.id]
            );

            if (rows.length) {
                await db.execute(
                    `INSERT INTO notifications
                     (user_id, title, message)
                     VALUES (?, ?, ?)`,
                    [
                        rows[0].student_id,
                        "Mentorship request updated",
                        `Your mentorship request was ${status}.`
                    ]
                );
            }

            res.json({
                success: true,
                message: `Request ${status} successfully.`
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({
                success: false,
                message: "Unable to update request."
            });
        }
    }
);

module.exports = router;
