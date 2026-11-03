const express = require('express');
const router = express.Router();
const { regionMastery } = require('../models/regionMastery');
const { calculateSM2 } = require('../utils/sm2');

// POST /api/quiz/attempt
router.post('/attempt', async (req, res) => {
  const { userId = 1, regionId, isCorrect, responseTimeMs } = req.body;

  if (!regionId || isCorrect === undefined) {
    return res.status(400).json({ error: 'Missing required fields: regionId or isCorrect' });
  }

  try {
    // 1. Map user performance to SM-2 Quality Grade (0 to 5)
    let quality = 0;
    if (isCorrect) {
      quality = responseTimeMs < 3000 ? 5 : 4; // Fast correct = 5, slower correct = 4
    } else {
      quality = 1; // Incorrect
    }

    // 2. Fetch current mastery record from DB (defaults if none exists yet)
    const existing = await RegionMastery.getMastery(userId, regionId);
    const prevEF = existing ? existing.easiness_factor : 2.5;
    const prevInterval = existing ? existing.interval : 0;
    const prevRepetitions = existing ? existing.repetitions : 0;

    // 3. Run the SM-2 algorithm calculation
    const sm2Result = calculateSM2(quality, prevEF, prevInterval, prevRepetitions);

    // 4. Save updated metrics back to PostgreSQL
    await regionMastery.upsert(
      userId,
      regionId,
      sm2Result.easinessFactor,
      sm2Result.interval,
      sm2Result.repetitions,
      sm2Result.nextReview
    );

    res.json({
      success: true,
      regionId,
      qualityAwarded: quality,
      updatedStats: sm2Result
    });

  } catch (err) {
    console.error('Failed to process quiz attempt:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;