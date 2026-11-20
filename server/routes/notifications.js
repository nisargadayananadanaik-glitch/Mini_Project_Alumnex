const express = require("express");
const db = require("../config/db");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
    try {
        const [notifications] = await db.execute(
            `SELECT id, title, message, is_read, created_at
             FROM notifications
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT 20`,
            [req.user.id]
        );

        res.json({ success: true, notifications });
    } catch (error) {
        console.error("Notification fetch error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to load notifications."
        });
    }
});

module.exports = router;
