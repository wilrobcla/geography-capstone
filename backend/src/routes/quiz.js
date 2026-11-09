const express = require('express');
const router = express.Router();
const { RegionMastery } = require('../models/regionMastery');
const { calculateSM2 } = require('../utils/sm2');

router.post('/attempt', async (req, res) => {
  const { userId = 1, regionId, quality } = req.body;

  console.log('Received quiz attempt:', { userId, regionId, quality });

  if (!regionId || quality === undefined || quality < 0 || quality > 5) {
    return res.status(400).json({ error: 'Missing or invalid fields: regionId or quality (must be 0-5)' });
  }

  try {
    // 1. Fetch current mastery record from DB (defaults if none exists yet)
    const existing = await RegionMastery.getMastery(userId, regionId);
    const prevEF = existing ? existing.easiness_factor : 2.5;
    const prevInterval = existing ? existing.interval : 0;
    const prevRepetitions = existing ? existing.repetitions : 0;

    // 2. Run the SM-2 algorithm calculation using the incoming quality score
    const sm2Result = calculateSM2(quality, prevEF, prevInterval, prevRepetitions);

    // 3. Save updated metrics back to PostgreSQL
    await RegionMastery.upsert(
      userId,
      regionId,
      sm2Result.easinessFactor,
      sm2Result.interval,
      sm2Result.repetitions,
      sm2Result.nextReview
    );

    console.log('Successfully saved attempt for:', regionId);

    res.json({
      success: true,
      regionId,
      qualityAwarded: quality,
      updatedStats: sm2Result
    });

  } catch (err) {
    console.error('FAILED TO PROCESS QUIZ ATTEMPT:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;