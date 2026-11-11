const express = require("express");
const rateLimit = require("express-rate-limit");

const {
    register,
    login,
    getCurrentUser,
    logout,
    getAccounts
} = require("../controllers/authController");

const router = express.Router();

// Limit repeated login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        error: "Too many login attempts. Try again later."
    }
});

// Registration
router.post("/register", register);

// Login
router.post("/login", loginLimiter, login);

// Current user
router.get("/me", getCurrentUser);

// Logout
router.post("/logout", logout);

router.get("/accounts", getAccounts);

module.exports = router;