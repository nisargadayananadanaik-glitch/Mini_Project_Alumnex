
const express = require("express");
const db = require("../config/db");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/auth");

const router = express.Router();

function isValidRegistrationLink(value) {
    if (!value) return true;

    try {
        const url = new URL(String(value));
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}


// ==========================================
// VIEW ALL EVENTS
// GET /api/events
// ==========================================

router.get("/", authenticateToken, async (req, res) => {
    try {
        const [events] = await db.execute(
            `SELECT
                e.*,
                u.name AS creator_name,
                u.email AS creator_email,
                u.role AS creator_role,
                (
                    SELECT COUNT(*)
                    FROM event_registrations er
                    WHERE er.event_id = e.id
                ) AS attendee_count,
                (
                    SELECT COUNT(*)
                    FROM event_registrations er
                    WHERE er.event_id = e.id AND er.user_id = ?
                ) AS is_registered
             FROM events e
             LEFT JOIN users u ON e.created_by = u.id
             ORDER BY e.event_date ASC`,
            [req.user.id]
        );

        return res.json({
            success: true,
            events
        });

    } catch (error) {
        console.error("VIEW EVENTS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load events."
        });
    }
});


// ==========================================
// MY REGISTERED EVENTS
// GET /api/events/my
// STUDENT / ALUMNI
// ==========================================

router.get(
    "/my",
    authenticateToken,
    authorizeRoles("student", "alumni"),
    async (req, res) => {
        try {
            const [events] = await db.execute(
                `SELECT
                    e.*,
                    u.name AS creator_name,
                    u.email AS creator_email,
                    er.registered_at,
                    1 AS is_registered,
                    (
                        SELECT COUNT(*)
                        FROM event_registrations all_registrations
                        WHERE all_registrations.event_id = e.id
                    ) AS attendee_count
                 FROM event_registrations er
                 INNER JOIN events e
                    ON er.event_id = e.id
                 LEFT JOIN users u
                    ON e.created_by = u.id
                 WHERE er.user_id = ?
                 ORDER BY e.event_date ASC`,
                [req.user.id]
            );

            return res.json({
                success: true,
                events
            });

        } catch (error) {
            console.error("MY EVENTS ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to load your registered events."
            });
        }
    }
);


// ==========================================
// REGISTER FOR EVENT
// POST /api/events/:id/register
// STUDENT / ALUMNI
// ==========================================

router.post(
    "/:id/register",
    authenticateToken,
    authorizeRoles("student", "alumni"),
    async (req, res) => {
        const eventId = Number(req.params.id);

        if (!Number.isInteger(eventId) || eventId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid event ID."
            });
        }

        try {
            const [events] = await db.execute(
                `SELECT e.id, e.title, e.created_by
                 FROM events e
                 WHERE e.id = ?`,
                [eventId]
            );

            if (!events.length) {
                return res.status(404).json({
                    success: false,
                    message: "Event not found."
                });
            }

            const event = events[0];

            await db.execute(
                `INSERT INTO event_registrations
                 (event_id, user_id)
                 VALUES (?, ?)`,
                [eventId, req.user.id]
            );

            // Notify the alumni/creator who created this event
            if (event.created_by && Number(event.created_by) !== Number(req.user.id)) {
                try {
                    const [students] = await db.execute(
                        `SELECT u.name, u.email, sp.phone, sp.department, sp.course, sp.study_year, sp.semester
                         FROM users u
                         LEFT JOIN student_profiles sp ON u.id = sp.user_id
                         WHERE u.id = ?`,
                        [req.user.id]
                    );

                    const student = students[0] || {};
                    const studentName = student.name || "A student";
                    const studentEmail = student.email || "";

                    const details = [];
                    if (studentEmail) details.push(`Email: ${studentEmail}`);
                    if (student.phone) details.push(`Phone: ${student.phone}`);
                    if (student.department) details.push(`Dept: ${student.department}`);
                    if (student.course) details.push(`Course: ${student.course}`);
                    if (student.study_year) details.push(`Year: ${student.study_year}`);
                    if (student.semester) details.push(`Semester: ${student.semester}`);

                    const detailsStr = details.length ? `\nStudent Details: ${details.join(" | ")}` : "";
                    const notifTitle = `New Registration: ${event.title}`;
                    const notifMessage = `${studentName} has registered for your event "${event.title}".${detailsStr}`;

                    await db.execute(
                        `INSERT INTO notifications (user_id, title, message)
                         VALUES (?, ?, ?)`,
                        [event.created_by, notifTitle, notifMessage]
                    );
                } catch (notifError) {
                    console.error("NOTIFICATION ERROR on event registration:", notifError);
                }
            }

            return res.status(201).json({
                success: true,
                message: "Successfully registered for the event."
            });

        } catch (error) {
            if (error.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    success: false,
                    message: "You are already registered for this event."
                });
            }

            console.error("EVENT REGISTRATION ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to register for this event."
            });
        }
    }
);


// ==========================================
// CANCEL EVENT REGISTRATION
// DELETE /api/events/:id/register
// STUDENT / ALUMNI
// ==========================================

router.delete(
    "/:id/register",
    authenticateToken,
    authorizeRoles("student", "alumni"),
    async (req, res) => {
        const eventId = Number(req.params.id);

        if (!Number.isInteger(eventId) || eventId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid event ID."
            });
        }

        try {
            const [events] = await db.execute(
                `SELECT id, title, created_by FROM events WHERE id = ?`,
                [eventId]
            );

            const [result] = await db.execute(
                `DELETE FROM event_registrations
                 WHERE event_id = ? AND user_id = ?`,
                [eventId, req.user.id]
            );

            if (!result.affectedRows) {
                return res.status(404).json({
                    success: false,
                    message: "You are not registered for this event."
                });
            }

            // Notify creator of cancellation if applicable
            if (events.length && events[0].created_by && Number(events[0].created_by) !== Number(req.user.id)) {
                try {
                    const [students] = await db.execute(
                        `SELECT name FROM users WHERE id = ?`,
                        [req.user.id]
                    );
                    const studentName = students[0]?.name || "A student";
                    await db.execute(
                        `INSERT INTO notifications (user_id, title, message)
                         VALUES (?, ?, ?)`,
                        [
                            events[0].created_by,
                            `Registration Cancelled: ${events[0].title}`,
                            `${studentName} has cancelled their registration for "${events[0].title}".`
                        ]
                    );
                } catch (notifErr) {
                    console.error("NOTIFICATION ERROR on registration cancellation:", notifErr);
                }
            }

            return res.json({
                success: true,
                message: "Event registration cancelled successfully."
            });

        } catch (error) {
            console.error("CANCEL REGISTRATION ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to cancel registration."
            });
        }
    }
);


// ==========================================
// VIEW EVENT ATTENDEES / REGISTRATIONS
// GET /api/events/:id/attendees
// ADMIN / ALUMNI (EVENT CREATOR)
// ==========================================

router.get(
    "/:id/attendees",
    authenticateToken,
    authorizeRoles("admin", "alumni"),
    async (req, res) => {
        const eventId = Number(req.params.id);

        if (!Number.isInteger(eventId) || eventId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid event ID."
            });
        }

        try {
            const [events] = await db.execute(
                `SELECT id, title, event_date, venue, created_by
                 FROM events
                 WHERE id = ?`,
                [eventId]
            );

            if (!events.length) {
                return res.status(404).json({
                    success: false,
                    message: "Event not found."
                });
            }

            const event = events[0];

            // If not admin, verify that the logged-in alumni is the creator of this event
            if (req.user.role !== "admin" && Number(event.created_by) !== Number(req.user.id)) {
                return res.status(403).json({
                    success: false,
                    message: "You can only view registrations for events you created."
                });
            }

            const [attendees] = await db.execute(
                `SELECT
                    u.id,
                    u.name,
                    u.email,
                    u.role,
                    er.registered_at,
                    sp.phone AS phone,
                    sp.department AS department,
                    sp.course AS course,
                    sp.study_year AS study_year,
                    sp.semester AS semester
                 FROM event_registrations er
                 INNER JOIN users u
                    ON er.user_id = u.id
                 LEFT JOIN student_profiles sp
                    ON sp.user_id = u.id
                 WHERE er.event_id = ?
                 ORDER BY er.registered_at DESC`,
                [eventId]
            );

            return res.json({
                success: true,
                event: {
                    id: event.id,
                    title: event.title,
                    event_date: event.event_date,
                    venue: event.venue
                },
                attendee_count: attendees.length,
                attendees
            });

        } catch (error) {
            console.error("EVENT ATTENDEES ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to load event attendees."
            });
        }
    }
);


// ==========================================
// CREATE EVENT
// POST /api/events
// ADMIN / EVENT OWNER
// ==========================================

router.post(
    "/",
    authenticateToken,
    authorizeRoles("admin", "alumni"),
    async (req, res) => {
        const { title, description, event_date, venue, registration_link } = req.body;
        const normalizedRegistrationLink = String(registration_link || "").trim();

        if (
            !title ||
            !String(title).trim() ||
            !event_date ||
            isNaN(Date.parse(event_date))
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid event title and date are required."
            });
        }

        if (
            normalizedRegistrationLink.length > 500 ||
            !isValidRegistrationLink(normalizedRegistrationLink)
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid HTTP or HTTPS registration link."
            });
        }

        try {
            const [result] = await db.execute(
                `INSERT INTO events
                 (title, description, event_date, venue, registration_link, created_by)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    String(title).trim(),
                    description || null,
                    event_date,
                    venue || null,
                    normalizedRegistrationLink || null,
                    req.user.id
                ]
            );

            return res.status(201).json({
                success: true,
                message: "Event created successfully.",
                eventId: result.insertId
            });

        } catch (error) {
            console.error("CREATE EVENT ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to create event."
            });
        }
    }
);


// ==========================================
// UPDATE EVENT
// PUT /api/events/:id
// ADMIN ONLY
// ==========================================

router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("admin"),
    async (req, res) => {
        const { title, description, event_date, venue, registration_link } = req.body;
        const eventId = Number(req.params.id);
        const normalizedRegistrationLink = String(registration_link || "").trim();

        if (!Number.isInteger(eventId) || eventId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid event ID."
            });
        }

        if (
            !title ||
            !String(title).trim() ||
            !event_date ||
            isNaN(Date.parse(event_date))
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid event title and date are required."
            });
        }

        if (
            normalizedRegistrationLink.length > 500 ||
            !isValidRegistrationLink(normalizedRegistrationLink)
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid HTTP or HTTPS registration link."
            });
        }

        try {
            const [result] = await db.execute(
                `UPDATE events
                 SET title = ?,
                     description = ?,
                     event_date = ?,
                     venue = ?,
                     registration_link = ?
                 WHERE id = ?`,
                [
                    String(title).trim(),
                    description || null,
                    event_date,
                    venue || null,
                    normalizedRegistrationLink || null,
                    eventId
                ]
            );

            if (!result.affectedRows) {
                return res.status(404).json({
                    success: false,
                    message: "Event not found."
                });
            }

            return res.json({
                success: true,
                message: "Event updated successfully."
            });

        } catch (error) {
            console.error("UPDATE EVENT ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to update event."
            });
        }
    }
);


// ==========================================
// DELETE EVENT
// DELETE /api/events/:id
// ADMIN / ALUMNI
// ==========================================

router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles("admin", "alumni"),
    async (req, res) => {
        const eventId = Number(req.params.id);

        if (!Number.isInteger(eventId) || eventId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid event ID."
            });
        }

        try {
            let query = "DELETE FROM events WHERE id = ?";
            const params = [eventId];

            if (req.user.role !== "admin") {
                query += " AND created_by = ?";
                params.push(req.user.id);
            }

            const [result] = await db.execute(
                query,
                params
            );

            if (!result.affectedRows) {
                return res.status(404).json({
                    success: false,
                    message: "Event not found or permission denied."
                });
            }

            return res.json({
                success: true,
                message: "Event deleted successfully."
            });

        } catch (error) {
            console.error("DELETE EVENT ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to delete event."
            });
        }
    }
);


module.exports = router;
