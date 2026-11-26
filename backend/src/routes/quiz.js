const express = require('express');
const router = express.Router();
const { pool, RegionMastery } = require('../models/regionMastery');
const { calculateSM2 } = require('../utils/sm2');

const ALPHA2_TO_ALPHA3 = {
  BR: 'BRA',
  CL: 'CHL',
  CO: 'COL',
  EC: 'ECU',
  PE: 'PER',
  VE: 'VEN',
  AR: 'ARG',
  GY: 'GUY',
  UY: 'URY',
  // add
};

async function resolveRegionId(pool, regionId) {
  if (regionId === undefined || regionId === null) return null;

  const str = String(regionId).trim().toUpperCase();
  if (!str) return null;

  // Already a numeric ID
  if (!Number.isNaN(Number(str))) {
    return Number(str);
  }

  // Convert 2-letter code to 3-letter code if mapped
  const lookupCode = ALPHA2_TO_ALPHA3[str] || str;

  const result = await pool.query(
    'SELECT id FROM regions WHERE UPPER(code) = $1 LIMIT 1',
    [lookupCode]
  );

  return result.rows[0]?.id ?? null;
}

router.post('/attempt', async (req, res) => {
  const { userId = 1, regionId, quality } = req.body;

  console.log('Received quiz attempt:', { userId, regionId, quality });

  if (!regionId || quality === undefined || quality < 0 || quality > 5) {
    return res.status(400).json({ error: 'Missing or invalid fields: regionId or quality (must be 0-5)' });
  }

  try {
    const numericRegionId = await resolveRegionId(pool, regionId);

    if (!numericRegionId) {
      return res.status(400).json({ error: `Could not find region for "${regionId}"` });
    }

    // 1. Fetch current mastery record using numericRegionId
    const existing = await RegionMastery.getMastery(userId, numericRegionId);
    const prevEF = existing ? existing.easiness_factor : 2.5;
    const prevInterval = existing ? existing.interval : 0;
    const prevRepetitions = existing ? existing.repetitions : 0;

    // 2. Run SM-2 calculation
    const sm2Result = calculateSM2(quality, prevEF, prevInterval, prevRepetitions);

    // 3. Save updated metrics using numericRegionId
    await RegionMastery.upsert(
      userId,
      numericRegionId,
      sm2Result.easinessFactor,
      sm2Result.interval,
      sm2Result.repetitions,
      sm2Result.nextReview
    );

    console.log('Successfully saved attempt for:', regionId, '-> ID:', numericRegionId);

    res.json({
      success: true,
      regionId,
      numericRegionId,
      qualityAwarded: quality,
      updatedStats: sm2Result
    });
  } catch (err) {
    console.error('FAILED TO PROCESS QUIZ ATTEMPT:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;