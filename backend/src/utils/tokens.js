const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/environment');
const { query } = require('../config/database');

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpires }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function storeRefreshToken(userId, token, expiresInDays = 7) {
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
  return token;
}

async function revokeRefreshToken(token) {
  const tokenHash = hashToken(token);
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash]
  );
}

async function validateRefreshToken(token) {
  const tokenHash = hashToken(token);
  const result = await query(
    `SELECT rt.*, u.id as user_id, u.name, u.email, u.role, u.is_active
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > NOW()`,
    [tokenHash]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

function generateBookingCode() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `SF-${date}-${random}`;
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  storeRefreshToken,
  revokeRefreshToken,
  validateRefreshToken,
  generateBookingCode,
};
