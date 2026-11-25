const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/geofill_db',
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false,
});

class RegionMastery {
  // Fetch existing mastery stats for a specific user and region
  static async getMastery(userId, regionId) {
    const query = `
      SELECT easiness_factor, interval, repetitions, last_reviewed, next_review
      FROM region_mastery
      WHERE user_id = $1 AND region_id = $2;
    `;
    const { rows } = await pool.query(query, [userId, regionId]);
    return rows[0] || null;
  }

  // Insert or update mastery metrics after a quiz attempt
  static async upsert(
    userId,
    regionId,
    ef,
    interval,
    repetitions,
    nextReview,
    lastReviewed = new Date()
  ) {
    const query = `
      INSERT INTO region_mastery (
        user_id,
        region_id,
        easiness_factor,
        interval,
        repetitions,
        last_reviewed,
        next_review
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, region_id) DO UPDATE SET
        easiness_factor = EXCLUDED.easiness_factor,
        interval = EXCLUDED.interval,
        repetitions = EXCLUDED.repetitions,
        last_reviewed = EXCLUDED.last_reviewed,
        next_review = EXCLUDED.next_review;
    `;
    await pool.query(query, [
      userId,
      regionId,
      ef,
      interval,
      repetitions,
      lastReviewed,
      nextReview,
    ]);
  }
}

module.exports = { RegionMastery, pool };