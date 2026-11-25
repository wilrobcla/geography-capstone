const fs = require('fs');
const path = require('path');
// Make sure the filename casing matches your file system: regionMastery.js
const { pool } = require('../backend/src/models/RegionMastery');

async function seedDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const dbInfo = await client.query('SELECT current_database(), current_schema(), version();');
    console.log('Connected DB:', dbInfo.rows[0]);

    const cols = await client.query(`
      SELECT table_schema, column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'regions';
    `);
    console.log('Regions columns:', cols.rows);

    // 1. Enable PostGIS extension
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');

    // 2. Create tables if they don't exist yet
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE,
        email VARCHAR(255) UNIQUE,
        password_hash TEXT,
        is_guest BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS regions (
        id SERIAL PRIMARY KEY,
        code VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        geom GEOMETRY(MultiPolygon, 4326)
      );

      CREATE TABLE IF NOT EXISTS region_mastery (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        region_id INT NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
        interval FLOAT DEFAULT 0,
        easiness_factor FLOAT DEFAULT 2.5,
        repetitions INT DEFAULT 0,
        last_reviewed TIMESTAMP WITH TIME ZONE,
        next_review TIMESTAMP WITH TIME ZONE,
        CONSTRAINT unique_user_region UNIQUE (user_id, region_id)
      );

      CREATE INDEX IF NOT EXISTS idx_region_mastery_user_region
        ON region_mastery(user_id, region_id);
    `);

    // Ensure existing tables have the updated columns/constraints
    await client.query(`
      ALTER TABLE users
        ALTER COLUMN username DROP NOT NULL,
        ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE,
        ADD COLUMN IF NOT EXISTS password_hash TEXT,
        ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT FALSE;
      
      ALTER TABLE regions
        ALTER COLUMN code TYPE VARCHAR(20),
        ALTER COLUMN name TYPE VARCHAR(255);

      ALTER TABLE region_mastery
        ADD COLUMN IF NOT EXISTS last_reviewed TIMESTAMP WITH TIME ZONE;
    `);

    // 3. Seed default user for local/dev testing and sync sequence
    await client.query(`
      INSERT INTO users (id, username, is_guest)
      VALUES (1, 'default_user', FALSE)
      ON CONFLICT (id) DO NOTHING;

      SELECT setval(
        pg_get_serial_sequence('users', 'id'),
        COALESCE((SELECT MAX(id) FROM users), 1),
        true
      );
    `);

   // 4. Read and parse GeoJSON
    const filePath = path.join(__dirname, '../frontend/public/data/countries.geojson');
    const rawData = fs.readFileSync(filePath, 'utf8');
    const geojson = JSON.parse(rawData);

    // 5. Loop and insert regions
    for (const feature of geojson.features) {
      const props = feature.properties || {};
      const code = String(props.ADM0_A3 || props.ISO_A3 || props.iso_a3 || '').trim().slice(0, 20);
      const name = String(props.ADMIN || props.NAME || props.name || '').trim().slice(0, 255);
      const geom = feature.geometry ? JSON.stringify(feature.geometry) : null;

      if (code && name && geom) {
        await client.query('SAVEPOINT sp_region');
        try {
          await client.query(
            `INSERT INTO regions (code, name, geom)
             VALUES ($1, $2, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)))
             ON CONFLICT (code) DO UPDATE
             SET name = EXCLUDED.name,
                 geom = EXCLUDED.geom;`,
            [code, name, geom]
          );
          await client.query('RELEASE SAVEPOINT sp_region');
        } catch (queryErr) {
            await client.query('ROLLBACK TO SAVEPOINT sp_region');
            console.error('First failure details:', {
              code,
              name,
              pgCode: queryErr.code,
              message: queryErr.message,
              table: queryErr.table,
              column: queryErr.column,
              constraint: queryErr.constraint,
              where: queryErr.where,
              stack: queryErr.stack,
            });
            break;
          }
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