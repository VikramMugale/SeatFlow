const { Pool } = require('pg');
const mongoose = require('mongoose');
const env = require('./environment');
const logger = require('../utils/logger');

// PostgreSQL pool
const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});

async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 200) {
      logger.warn('Slow query', { duration, text: text.substring(0, 100) });
    }
    return result;
  } catch (err) {
    logger.error('PostgreSQL query error', { error: err.message, text: text.substring(0, 100) });
    throw err;
  }
}

async function getClient() {
  return pool.connect();
}

async function connectPostgres() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    logger.info('PostgreSQL connected');
  } finally {
    client.release();
  }
}

async function connectMongo() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongodbUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });
  logger.info('MongoDB connected');
}

async function disconnectAll() {
  await pool.end();
  await mongoose.disconnect();
  logger.info('Databases disconnected');
}

module.exports = {
  pool,
  query,
  getClient,
  connectPostgres,
  connectMongo,
  disconnectAll,
};
