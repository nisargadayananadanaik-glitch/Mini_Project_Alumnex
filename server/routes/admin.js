
const express = require("express");
const db = require("../config/db");
const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/auth");

const router = express.Router();

router.use(authenticateToken, authorizeRoles("admin"));

// DASHBOARD STATISTICS
router.get("/stats", async (req, res) => {
    try {
        const [users] = await db.execute(
            `SELECT
                COUNT(*) AS total_users,
                SUM(role = 'student') AS students,
                SUM(role = 'alumni') AS alumni,
                SUM(role = 'admin') AS admins,
                SUM(status = 'pending' AND role = 'alumni') AS pending_alumni
             FROM users`
        );

        const [events] = await db.execute(
            "SELECT COUNT(*) AS total_events FROM events"
        );

        const [jobs] = await db.execute(
            "SELECT COUNT(*) AS total_jobs FROM jobs"
        );

        const [mentorship] = await db.execute(
            "SELECT COUNT(*) AS total_requests FROM mentorship"
        );

        res.json({
            success: true,
            stats: {
                ...users[0],
                total_events: events[0].total_events,
                total_jobs: jobs[0].total_jobs,
                total_mentorship_requests:
                    mentorship[0].total_requests
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Unable to load statistics."
        });
    }
});

// VIEW ALL USERS
router.get("/users", async (req, res) => {
    try {
        const [users] = await db.execute(
            `SELECT id, name, email, role, status, created_at
             FROM users
             ORDER BY created_at DESC`
        );

        res.json({ success: true, users });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Unable to load users."
        });
    }
});

// APPROVE OR REJECT ALUMNI
router.patch("/alumni/:id/status", async (req, res) => {
    const { status } = req.body;

    if (!["approved", "blocked"].includes(status)) {
        return res.status(400).json({
            success: false,
            message: "Status must be approved or blocked."
        });
    }

    try {
        const [result] = await db.execute(
            `UPDATE users
             SET status = ?
             WHERE id = ? AND role = 'alumni'`,
            [status, req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                success: false,
                message: "Alumni account not found."
            });
        }

        await db.execute(
            `INSERT INTO notifications
             (user_id, title, message)
             VALUES (?, ?, ?)`,
            [
                req.params.id,
                "Account status updated",
                status === "approved"
                    ? "Your alumni account has been approved."
                    : "Your alumni account has been blocked."
            ]
        );

        res.json({
            success: true,
            message: `Alumni account ${status}.`
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Unable to update alumni status."
        });
    }
});

// BLOCK OR APPROVE A STUDENT
router.patch("/users/:id/status", async (req, res) => {
    const { status } = req.body;

    if (!["approved", "blocked"].includes(status)) {
        return res.status(400).json({
            success: false,
            message: "Invalid account status."
        });
    }

    try {
        const [result] = await db.execute(
            `UPDATE users
             SET status = ?
             WHERE id = ? AND role = 'student'`,
            [status, req.params.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                success: false,
                message: "Student account not found."
            });
        }

        await db.execute(
            `INSERT INTO notifications
             (user_id, title, message)
             VALUES (?, ?, ?)`,
            [
                req.params.id,
                "Account status updated",
                `Your account has been ${status}.`
            ]
        );

        res.json({
            success: true,
            message: `Student account ${status}.`
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Unable to update student."
        });
    }
});

module.exports = router;
