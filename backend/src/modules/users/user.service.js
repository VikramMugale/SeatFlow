/**
 * User Management Service (Admin)
 */
const bcrypt = require('bcryptjs');
const { query } = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

async function listUsers({ page = 1, limit = 20, role, search } = {}) {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  let idx = 1;

  if (role) {
    conditions.push(`role = $${idx++}`);
    params.push(role);
  }
  if (search) {
    conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await query(`SELECT COUNT(*) FROM users ${where}`, params);
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(limit, offset);
  const result = await query(
    `SELECT id, name, email, phone, role, is_email_verified, is_active, created_at
     FROM users ${where}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    params
  );

  return {
    users: result.rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

async function getUserById(id) {
  const result = await query(
    `SELECT id, name, email, phone, role, is_email_verified, is_active, created_at, updated_at
     FROM users WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  return result.rows[0];
}

async function updateUser(id, { name, phone, role, is_active }) {
  const fields = [];
  const params = [];
  let idx = 1;

  if (name !== undefined) {
    fields.push(`name = $${idx++}`);
    params.push(name);
  }
  if (phone !== undefined) {
    fields.push(`phone = $${idx++}`);
    params.push(phone);
  }
  if (role !== undefined) {
    fields.push(`role = $${idx++}`);
    params.push(role);
  }
  if (is_active !== undefined) {
    fields.push(`is_active = $${idx++}`);
    params.push(is_active);
  }

  if (fields.length === 0) {
    return getUserById(id);
  }

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const result = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, email, phone, role, is_active`,
    params
  );
  if (result.rows.length === 0) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  logger.info('User updated', { userId: id });
  return result.rows[0];
}

async function changePassword(userId, currentPassword, newPassword) {
  const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!valid) {
    throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
  }
  const hash = await bcrypt.hash(newPassword, 12);
  await query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [hash, userId]
  );
  logger.info('Password changed', { userId });
  return { success: true };
}

async function getAdminStats() {
  const [users, events, bookings, revenue, activeLocks, failedPayments] = await Promise.all([
    query('SELECT COUNT(*) FROM users WHERE is_active = true'),
    query('SELECT COUNT(*) FROM events WHERE is_published = true'),
    query(`SELECT COUNT(*) FROM bookings WHERE status = 'CONFIRMED'`),
    query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM bookings WHERE status = 'CONFIRMED'`),
    query(`SELECT COUNT(*) FROM show_seats WHERE status = 'LOCKED'`),
    query(`SELECT COUNT(*) FROM payments WHERE status = 'FAILED'`),
  ]);

  const todayBookings = await query(
    `SELECT COUNT(*) FROM bookings WHERE status = 'CONFIRMED' AND created_at::date = CURRENT_DATE`
  );

  return {
    totalUsers: parseInt(users.rows[0].count, 10),
    totalEvents: parseInt(events.rows[0].count, 10),
    totalBookings: parseInt(bookings.rows[0].count, 10),
    todayBookings: parseInt(todayBookings.rows[0].count, 10),
    revenue: parseFloat(revenue.rows[0].total),
    activeLocks: parseInt(activeLocks.rows[0].count, 10),
    failedPayments: parseInt(failedPayments.rows[0].count, 10),
  };
}

module.exports = {
  listUsers,
  getUserById,
  updateUser,
  changePassword,
  getAdminStats,
};
