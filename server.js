
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(
    path.join(__dirname, "../client")
));

app.use("/api/auth", require("./routes/auth"));

app.get("/api/health", async (req, res) => {
    try {
        await db.query("SELECT 1");

        res.json({
            status: "success",
            message: "ALUMNEX server and database connected"
        });

    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Database connection failed"
        });
    }
});

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../client/index.html")
    );
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`ALUMNEX running at http://localhost:${PORT}`);
});
