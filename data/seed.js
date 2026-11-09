const fs = require('fs');
const path = require('path');
// Make sure the filename casing matches your file system: regionMastery.js
const { pool } = require('../backend/src/models/regionMastery');

async function seedDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Enable PostGIS extension
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');

    // 2. Create tables if they don't exist yet (aligned with regionMastery.js)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS regions (
        id SERIAL PRIMARY KEY,
        code VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        geom GEOMETRY(MultiPolygon, 4326)
      );

      CREATE TABLE IF NOT EXISTS region_mastery (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        region_id INT REFERENCES regions(id) ON DELETE CASCADE,
        interval FLOAT DEFAULT 0,
        easiness_factor FLOAT DEFAULT 2.5,
        repetitions INT DEFAULT 0,
        next_review TIMESTAMP,
        CONSTRAINT unique_user_region UNIQUE (user_id, region_id)
      );
    `);

    // 3. Insert a default test user if none exists
    await client.query(`
      INSERT INTO users (id, username) 
      VALUES (1, 'default_user') 
      ON CONFLICT (id) DO NOTHING;
    `);

    // 4. Read and parse your GeoJSON file (pointing to frontend/public/data/countries.geojson)
    const filePath = path.join(__dirname, '../frontend/public/data/countries.geojson');
    const rawData = fs.readFileSync(filePath, 'utf8');
    const geojson = JSON.parse(rawData);

    // 5. Loop and insert regions
    for (const feature of geojson.features) {
      const code = feature.properties.ADM0_A3 || feature.properties.iso_a3;
      const name = feature.properties.NAME || feature.properties.name;
      const geom = JSON.stringify(feature.geometry);

      if (code && name) {
        await client.query(
          `INSERT INTO regions (code, name, geom) 
           VALUES ($1, $2, ST_GeomFromGeoJSON($3)) 
           ON CONFLICT (code) DO UPDATE 
           SET name = EXCLUDED.name, geom = EXCLUDED.geom;`,
          [code, name, geom]
        );
      }
    }

    await client.query('COMMIT');
    console.log('Successfully set up schema and seeded regions!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Setup failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();