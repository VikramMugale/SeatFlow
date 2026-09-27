require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const env = require('../config/environment');

const pool = new Pool({ connectionString: env.databaseUrl });
const schemaPath = path.join(__dirname, 'schema.sql');

async function migrate() {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(schema);
    await client.query('COMMIT');
    console.log('PostgreSQL schema applied successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error('PostgreSQL schema migration failed:', error.message);
  process.exitCode = 1;
});
