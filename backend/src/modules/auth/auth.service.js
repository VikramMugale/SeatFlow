const bcrypt = require('bcryptjs');
const { query } = require('../../config/database');
const {
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  revokeRefreshToken,
  validateRefreshToken,
} = require('../../utils/tokens');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

const SALT_ROUNDS = 12;

async function register({ name, email, password, phone }) {
  const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length > 0) {
    throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await query(
    `INSERT INTO users (name, email, password_hash, phone, role)
     VALUES ($1, $2, $3, $4, 'CUSTOMER')
     RETURNING id, name, email, role, created_at`,
    [name, email.toLowerCase(), passwordHash, phone || null]
  );

  const user = result.rows[0];
  logger.info('User registered', { userId: user.id, email: user.email });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  await storeRefreshToken(user.id, refreshToken);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

async function login({ email, password }) {
  const result = await query(
    'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const user = result.rows[0];
  if (!user.is_active) {
    throw new AppError('Account is deactivated', 403, 'ACCOUNT_INACTIVE');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  await storeRefreshToken(user.id, refreshToken);

  logger.info('User logged in', { userId: user.id });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

async function refresh(refreshToken) {
  const row = await validateRefreshToken(refreshToken);
  if (!row) {
    throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH');
  }

  // Rotate: revoke old, issue new
  await revokeRefreshToken(refreshToken);

  const user = {
    id: row.user_id,
    name: row.name,
    email: row.email,
    role: row.role,
  };

  const accessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken();
  await storeRefreshToken(user.id, newRefreshToken);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

async function logout(refreshToken) {
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  return { success: true };
}

/**
 * Forgot password (demo implementation)
 * Stores a short-lived reset token in Redis if available; otherwise returns a demo token.
 * Production: email the link, never return the token in the API response.
 */
async function forgotPassword(email) {
  const result = await query(
    'SELECT id FROM users WHERE email = $1 AND is_active = true',
    [email.toLowerCase()]
  );
  if (result.rows.length === 0) {
    // Do not reveal whether email exists
    return { sent: true };
  }
  const userId = result.rows[0].id;
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    const { getRedis } = require('../../config/redis');
    await getRedis().set(`pwd-reset:${tokenHash}`, userId, 'EX', 3600);
  } catch (e) {
    // Redis optional for this demo path
  }

  logger.info('Password reset requested', { userId, email });
  // Demo only — do not expose token in production
  return { sent: true, demoResetToken: token };
}

async function resetPassword(token, newPassword) {
  if (!token || !newPassword || newPassword.length < 8) {
    throw new AppError('Invalid token or password too short', 400, 'INVALID_RESET');
  }
  const crypto = require('crypto');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  let userId = null;
  try {
    const { getRedis } = require('../../config/redis');
    userId = await getRedis().get(`pwd-reset:${tokenHash}`);
    if (userId) {
      await getRedis().del(`pwd-reset:${tokenHash}`);
    }
  } catch (e) {
    // fall through
  }

  if (!userId) {
    throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [hash, userId]
  );
  logger.info('Password reset completed', { userId });
  return { success: true };
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
};
