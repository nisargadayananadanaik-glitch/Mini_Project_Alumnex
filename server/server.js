
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Authentication
app.use("/api/auth", require("./routes/auth"));

// Other modules
app.use("/api/alumni", require("./routes/alumni"));
app.use("/api/dashboard", require("./routes/dashboard"));

app.use("/api/jobs", require("./routes/jobs"));
app.use("/api/events", require("./routes/events"));
app.use("/api/mentorship", require("./routes/mentorship"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/profile", require("./routes/profiles"));

// Health check
app.get("/api/health", async (req, res) => {
    try {
        await db.query("SELECT 1");

        res.json({
            success: true,
            message: "ALUMNEX and MySQL connected!"
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Database connection failed."
        });
    }
});

// Frontend
app.use(express.static(path.join(__dirname, "../client")));

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../client/index.html")
    );
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log("================================");
    console.log("       ALUMNEX SERVER");
    console.log("================================");
    console.log(`Running: http://localhost:${PORT}`);
});
