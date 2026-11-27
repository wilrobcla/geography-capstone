const express = require('express');
const router = express.Router();
const countries = require('i18n-iso-countries');
const { pool, RegionMastery } = require('../models/regionMastery');
const { calculateSM2 } = require('../utils/sm2');

async function resolveRegionId(pool, regionId) {
  if (regionId === undefined || regionId === null) return null;

  const str = String(regionId).trim().toUpperCase();
  if (!str || str === '-99') return null;

  // Accept only positive integers as numeric IDs; reject '-99' and non-positive numbers
  const num = Number(str);
  if (Number.isInteger(num)) {
    return num > 0 ? num : null;
  }

  // Convert 2-letter ISO code to 3-letter ISO code when possible, else keep as-is
  const lookupCode = str.length === 2
    ? (countries.alpha2ToAlpha3(str) || str)
    : str;

  const result = await pool.query(
    'SELECT id FROM regions WHERE UPPER(code) = $1 LIMIT 1',
    [lookupCode]
  );

  return result.rows[0]?.id ?? null;
}

// POST /api/quiz/attempt
router.post('/attempt', async (req, res) => {
  const { userId = 1, regionId, isCorrect, responseTimeMs, quality: explicitQuality } = req.body;

  console.log('Received quiz attempt:', { userId, regionId, isCorrect, responseTimeMs, explicitQuality });

  const hasExplicitQuality = explicitQuality !== undefined && explicitQuality !== null;
  const hasBooleanResult = isCorrect !== undefined && isCorrect !== null;

  if (!regionId || (!hasExplicitQuality && !hasBooleanResult)) {
    console.warn('400_MISSING_FIELDS', { body: req.body });
    return res.status(400).json({
      error: 'Missing required fields: regionId and either quality (0-5) or isCorrect'
    });
  }

  let quality;
  if (hasExplicitQuality) {
    quality = Number(explicitQuality);
    if (Number.isNaN(quality) || quality < 0 || quality > 5) {
      console.warn('400_INVALID_QUALITY', { explicitQuality, quality });
      return res.status(400).json({ error: 'Invalid quality: must be between 0 and 5' });
    }
  } else if (isCorrect) {
    quality = responseTimeMs !== undefined && responseTimeMs < 3000 ? 5 : 4;
  } else {
    quality = 1;
  }

  try {
    const numericRegionId = await resolveRegionId(pool, regionId);

    if (!numericRegionId || numericRegionId <= 0) {
      console.warn('400_REGION_NOT_FOUND', { regionId, numericRegionId });
      return res.status(400).json({ error: `Could not find or invalid region for "${regionId}"` });
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