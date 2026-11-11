const express = require("express");
const router = express.Router();

const requireAuth = require("../middleware/requireAuth");
const { getProfile } = require("../controllers/playerController");

router.get("/profile", requireAuth, getProfile);

module.exports = router;