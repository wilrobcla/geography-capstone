const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/geofill_db'
});

class RegionMastery {
  // Fetch existing mastery stats for a specific user and region
  static async getMastery(userId, regionId) {
    const query = `
      SELECT easiness_factor, interval, repetitions, next_review 
      FROM region_mastery 
      WHERE user_id = $1 AND region_id = $2;
    `;
    const { rows } = await pool.query(query, [userId, regionId]);
    return rows[0] || null;
  }

  // Insert or update mastery metrics after a quiz attempt
  static async upsert(userId, regionId, ef, interval, repetitions, nextReview) {
    const query = `
      INSERT INTO region_mastery (user_id, region_id, easiness_factor, interval, repetitions, next_review)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, region_id) DO UPDATE SET
        easiness_factor = EXCLUDED.easiness_factor,
        interval = EXCLUDED.interval,
        repetitions = EXCLUDED.repetitions,
        next_review = EXCLUDED.next_review;
    `;
    await pool.query(query, [userId, regionId, ef, interval, repetitions, nextReview]);
  }
}

module.exports = { RegionMastery, pool };