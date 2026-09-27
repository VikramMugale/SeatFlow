const { query, getClient } = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

async function listBookings(userId, { status, page = 1, limit = 20 }) {
  const conditions = ['b.user_id = $1'];
  const params = [userId];
  let idx = 2;

  if (status) {
    conditions.push(`b.status = $${idx++}`);
    params.push(status);
  }

  params.push(limit, (page - 1) * limit);
  const result = await query(
    `SELECT b.*, e.title as event_title, e.poster_url, e.event_type,
            s.show_date, s.show_time, v.name as venue_name, v.city as venue_city,
            (SELECT json_agg(json_build_object('seatLabel', bs.seat_label, 'price', bs.price))
             FROM booking_seats bs WHERE bs.booking_id = b.id) as seats
     FROM bookings b
     JOIN shows s ON s.id = b.show_id
     JOIN events e ON e.id = s.event_id
     JOIN venues v ON v.id = s.venue_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY b.created_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    params
  );
  return result.rows;
}

async function getBooking(id, userId) {
  const result = await query(
    `SELECT b.*, e.title as event_title, e.poster_url, e.event_type, e.duration_minutes,
            s.show_date, s.show_time, v.name as venue_name, v.city as venue_city, v.address as venue_address,
            (SELECT json_agg(json_build_object('seatLabel', bs.seat_label, 'price', bs.price))
             FROM booking_seats bs WHERE bs.booking_id = b.id) as seats
     FROM bookings b
     JOIN shows s ON s.id = b.show_id
     JOIN events e ON e.id = s.event_id
     JOIN venues v ON v.id = s.venue_id
     WHERE b.id = $1 AND b.user_id = $2`,
    [id, userId]
  );
  if (result.rows.length === 0) throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
  return result.rows[0];
}

async function cancelBooking(id, userId) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT * FROM bookings WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [id, userId]
    );
    if (result.rows.length === 0) throw new AppError('Booking not found', 404);
    const booking = result.rows[0];

    if (booking.status !== 'CONFIRMED') {
      throw new AppError('Only confirmed bookings can be cancelled', 400, 'INVALID_STATUS');
    }

    // Check show time — allow cancel only if > 2 hours before
    const showResult = await client.query(
      `SELECT show_date, show_time FROM shows WHERE id = $1`,
      [booking.show_id]
    );
    const show = showResult.rows[0];
    const showDateTime = new Date(`${show.show_date}T${show.show_time}`);
    const hoursUntil = (showDateTime - new Date()) / (1000 * 60 * 60);
    if (hoursUntil < 2) {
      throw new AppError('Cannot cancel within 2 hours of show time', 400, 'TOO_LATE');
    }

    await client.query(
      `UPDATE bookings SET status = 'CANCELLED', cancelled_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );

    // Release seats
    const seats = await client.query(
      `SELECT show_seat_id FROM booking_seats WHERE booking_id = $1`,
      [id]
    );
    const seatIds = seats.rows.map((r) => r.show_seat_id);
    await client.query(
      `UPDATE show_seats SET status = 'AVAILABLE', booked_by = NULL WHERE id = ANY($1::uuid[])`,
      [seatIds]
    );

    // Create refund record
    await client.query(
      `INSERT INTO refunds (booking_id, payment_id, amount, reason, status)
       VALUES ($1, $2, $3, 'User cancellation', 'PENDING')`,
      [id, booking.payment_id, booking.total_amount]
    );

    await client.query('COMMIT');
    logger.info('Booking cancelled', { bookingId: id, userId });
    return { success: true, message: 'Booking cancelled. Refund will be processed.' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { listBookings, getBooking, cancelBooking };
