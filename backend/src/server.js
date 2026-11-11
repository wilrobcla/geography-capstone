const express = require("express");
const session = require("express-session");
const path = require("path");
const cors = require("cors");
const playerRoutes = require("./routes/playerRoutes");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 3000;


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("src/public"));

// Serve frontend files
app.use(express.static(path.join(__dirname, "public")));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24
    }
}));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/player", playerRoutes);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Test route
app.get("/", (req, res) => {
    res.json({
        message: "Geography Game API is running!"
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).json({
        error: "An internal server error occurred."
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});