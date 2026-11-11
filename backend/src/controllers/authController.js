const bcrypt = require("bcrypt");
const crypto = require("crypto");

const {
    findUserByEmail,
    findUserByUsername,
    findUserById,
    createUser,
    getAllUsers
} = require("../models/userStore");

// Remove sensitive information before sending a user to React
function publicUser(user) {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
    };
}

// REGISTRATION
async function register(req, res, next) {
    try {
        const { username, email, password } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({
                error: "All fields are required."
            });
        }

        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (cleanUsername.length < 3 || cleanUsername.length > 20) {
            return res.status(400).json({
                error: "Username must be between 3 and 20 characters."
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return res.status(400).json({
                error: "Invalid email address."
            });
        }

        if (typeof password !== "string" ||
            password.length < 8 ||
            Buffer.byteLength(password, "utf8") > 72) {
            return res.status(400).json({
                error: "Password must be at least 8 characters and no more than 72 UTF-8 bytes."
            });
        }

        // Check whether account already exists
        if (findUserByEmail(cleanEmail)) {
            return res.status(409).json({
                error: "Email is already registered."
            });
        }

        if (findUserByUsername(cleanUsername.toLowerCase())) {
            return res.status(409).json({
                error: "Username is already taken."
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const user = {
            id: crypto.randomUUID(),
            username: cleanUsername,
            email: cleanEmail,
            passwordHash,
            createdAt: new Date().toISOString()
        };

        createUser(user);

        // Establish login session
        req.session.regenerate(err => {
            if (err) {
                return next(err);
            }

            req.session.userId = user.id;

            req.session.save(err => {
                if (err) {
                    return next(err);
                }

                return res.status(201).json({
                    message: "Account created successfully.",
                    user: publicUser(user)
                });
            });
        });

    } catch (error) {
        next(error);
    }
}

// LOGIN
async function login(req, res, next) {
    try {
        const { email, password } = req.body;

        if (typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password) {
            return res.status(400).json({
                error: "Email and password are required."
            });
        }

        // Find account
        const user = findUserByEmail(email.trim().toLowerCase());

        if (!user) {
            return res.status(401).json({
                error: "Invalid email or password."
            });
        }

        // Verify password
        const passwordMatches = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                error: "Invalid email or password."
            });
        }

        // Create new session
        req.session.regenerate(err => {
            if (err) {
                return next(err);
            }

            req.session.userId = user.id;

            req.session.save(err => {
                if (err) {
                    return next(err);
                }

                return res.json({
                    message: "Login successful.",
                    user: publicUser(user)
                });
            });
        });

    } catch (error) {
        next(error);
    }
}

// CHECK CURRENT USER
function getCurrentUser(req, res) {
    const user = findUserById(req.session.userId);

    if (!user) {
        return res.status(401).json({
            error: "Not authenticated."
        });
    }

    return res.json({
        user: publicUser(user)
    });
}

// LOGOUT
function logout(req, res, next) {
    req.session.destroy(err => {
        if (err) {
            return next(err);
        }

        res.clearCookie("connect.sid");

        return res.json({
            message: "Logged out successfully."
        });
    });
}

function getAccounts(req, res) {
    const users = getAllUsers();

    const accounts = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
    }));

    res.json({ accounts });
}

module.exports = {
    register,
    login,
    getCurrentUser,
    logout,
    getAccounts
};