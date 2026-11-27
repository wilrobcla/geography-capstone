const express = require('express');
const router = express.Router();
const { pool } = require('../models/regionMastery');

// GET user profile and mastery progress for the demo user)
router.get('/progress', async (req, res) => {
  try {
    const userId = 1; // Default test user ID

    // Fetch user details
    const userResult = await pool.query('SELECT id, username, created_at FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const masteryResult = await pool.query(
      `SELECT 
         rm.region_id,
         r.code AS region_code,
         rm.interval,
         rm.easiness_factor,
         rm.repetitions,
         rm.next_review
       FROM region_mastery rm
       JOIN regions r ON rm.region_id = r.id
       WHERE rm.user_id = $1`,
      [userId]
    );

    res.json({
      user: userResult.rows[0],
      masteryRecords: masteryResult.rows
    });
  } catch (err) {
    console.error('Error fetching user progress:', err);
    res.status(500).json({ error: 'Server error while fetching progress' });
  }
});

module.exports = router;