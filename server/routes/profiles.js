
const express = require("express");
const db = require("../config/db");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// GET LOGGED-IN USER PROFILE
router.get("/", authenticateToken, async (req, res) => {
    try {
        const [users] = await db.execute(
            `SELECT id, name, email, role, status, created_at
             FROM users
             WHERE id = ?`,
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const user = users[0];
        let profile = {};

        if (user.role === "student") {
            const [rows] = await db.execute(
                `SELECT phone, department, course, study_year, semester,
                        graduation_year, skills, interests, career_goals,
                        resume_url, linkedin_url, github_url, bio, photo_url
                 FROM student_profiles
                 WHERE user_id = ?`,
                [user.id]
            );

            profile = rows[0] || {};

        } else if (user.role === "alumni") {
            const [rows] = await db.execute(
                `SELECT phone, college, graduation_year, department, company, designation,
                        skills, work_experience, linkedin_url, career_journey,
                        bio, photo_url
                 FROM alumni_profiles
                 WHERE user_id = ?`,
                [user.id]
            );

            profile = rows[0] || {};
        }

        return res.json({
            success: true,
            user,
            profile
        });

    } catch (error) {
        console.error("Profile fetch error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch profile."
        });
    }
});


// UPDATE LOGGED-IN USER PROFILE
router.put("/", authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user.id;
        const role = req.user.role;

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Name cannot be empty."
                });
            }

            await db.execute(
                "UPDATE users SET name = ? WHERE id = ?",
                [name.trim(), userId]
            );
        }

        if (role === "student") {
            const {
                phone, department, course, study_year, semester, graduation_year,
                skills, interests, career_goals, resume_url, linkedin_url,
                github_url, bio, photo_url
            } = req.body;

            await db.execute(
                `UPDATE student_profiles
                 SET phone = COALESCE(?, phone),
                     department = COALESCE(?, department),
                     course = COALESCE(?, course),
                     study_year = COALESCE(?, study_year),
                     semester = COALESCE(?, semester),
                     graduation_year = COALESCE(?, graduation_year),
                     skills = COALESCE(?, skills),
                     interests = COALESCE(?, interests),
                     career_goals = COALESCE(?, career_goals),
                     resume_url = COALESCE(?, resume_url),
                     linkedin_url = COALESCE(?, linkedin_url),
                     github_url = COALESCE(?, github_url),
                     bio = COALESCE(?, bio),
                     photo_url = COALESCE(?, photo_url)
                 WHERE user_id = ?`,
                [
                    phone ?? null,
                    department ?? null,
                    course ?? null,
                    study_year ?? null,
                    semester ?? null,
                    graduation_year || null,
                    skills ?? null,
                    interests ?? null,
                    career_goals ?? null,
                    resume_url ?? null,
                    linkedin_url ?? null,
                    github_url ?? null,
                    bio ?? null,
                    photo_url ?? null,
                    userId
                ]
            );

        } else if (role === "alumni") {
            const {
                phone,
                college,
                graduation_year,
                department,
                company,
                designation,
                skills,
                work_experience,
                linkedin_url,
                career_journey,
                bio,
                photo_url
            } = req.body;

            await db.execute(
                `UPDATE alumni_profiles
                 SET phone = COALESCE(?, phone),
                     college = COALESCE(?, college),
                     graduation_year = COALESCE(?, graduation_year),
                     department = COALESCE(?, department),
                     company = COALESCE(?, company),
                     designation = COALESCE(?, designation),
                     skills = COALESCE(?, skills),
                     work_experience = COALESCE(?, work_experience),
                     linkedin_url = COALESCE(?, linkedin_url),
                     career_journey = COALESCE(?, career_journey),
                     bio = COALESCE(?, bio),
                     photo_url = COALESCE(?, photo_url)
                 WHERE user_id = ?`,
                [
                    phone ?? null,
                    college ?? null,
                    graduation_year || null,
                    department ?? null,
                    company ?? null,
                    designation ?? null,
                    skills ?? null,
                    work_experience ?? null,
                    linkedin_url ?? null,
                    career_journey ?? null,
                    bio ?? null,
                    photo_url ?? null,
                    userId
                ]
            );
        }

        return res.json({
            success: true,
            message: "Profile updated successfully."
        });

    } catch (error) {
        console.error("Profile update error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update profile."
        });
    }
});

module.exports = router;
