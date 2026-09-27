/**
 * Seat Reservation Service — Core distributed locking logic
 *
 * Flow:
 * 1. Validate show & seats
 * 2. Acquire Redis locks (SET NX EX) for all seats atomically
 * 3. Create reservation in PostgreSQL
 * 4. Update show_seats status to LOCKED
 * 5. Schedule expiration job
 *
 * If any lock fails → release acquired locks and reject.
 */
const { getClient, query } = require('../../config/database');
const {
  acquireSeatLock,
  releaseSeatLocks,
  releaseSeatLock,
} = require('../../config/redis');
const env = require('../../config/environment');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');
const { getIO } = require('../../sockets/seat.socket');

async function createReservation(userId, { showId, seatIds }, idempotencyKey = null) {
  // Idempotency: return existing reservation if key already used
  if (idempotencyKey) {
    const existing = await query(
      `SELECT r.*, 
        (SELECT json_agg(json_build_object('seatLabel', rs.seat_label, 'price', rs.price))
         FROM reservation_seats rs WHERE rs.reservation_id = r.id) as seats
       FROM reservations r
       WHERE r.idempotency_key = $1 AND r.user_id = $2 AND r.status = 'ACTIVE'`,
      [idempotencyKey, userId]
    );
    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      return formatReservation(row);
    }
  }

  // Validate show exists and is scheduled
  const showResult = await query(
    `SELECT s.id, s.status, s.base_price, s.pricing, e.title as event_title
     FROM shows s
     JOIN events e ON e.id = s.event_id
     WHERE s.id = $1`,
    [showId]
  );
  if (showResult.rows.length === 0) {
    throw new AppError('Show not found', 404, 'SHOW_NOT_FOUND');
  }
  const show = showResult.rows[0];
  if (show.status === 'CANCELLED') {
    throw new AppError('Show has been cancelled', 400, 'SHOW_CANCELLED');
  }

  // Fetch show seats and verify availability
  const seatsResult = await query(
    `SELECT ss.id, ss.seat_id, ss.status, ss.price, se.seat_label
     FROM show_seats ss
     JOIN seats se ON se.id = ss.seat_id
     WHERE ss.show_id = $1 AND ss.id = ANY($2::uuid[])`,
    [showId, seatIds]
  );

  if (seatsResult.rows.length !== seatIds.length) {
    throw new AppError('One or more seats not found for this show', 400, 'INVALID_SEATS');
  }

  const seats = seatsResult.rows;
  const unavailable = seats.filter((s) => s.status !== 'AVAILABLE');
  if (unavailable.length > 0) {
    throw new AppError(
      `Seats unavailable: ${unavailable.map((s) => s.seat_label).join(', ')}`,
      409,
      'SEATS_UNAVAILABLE'
    );
  }

  // --- Distributed locking (Redis) ---
  const acquiredLocks = [];
  const ttl = env.seatLockTtlSeconds;

  try {
    for (const seat of seats) {
      // Use show_seat id as lock key identifier for uniqueness
      const locked = await acquireSeatLock(showId, seat.id, userId, ttl);
      if (!locked) {
        // Failed to acquire — another user got it
        throw new AppError(
          `Seat ${seat.seat_label} is no longer available`,
          409,
          'SEAT_LOCKED'
        );
      }
      acquiredLocks.push(seat.id);
    }
  } catch (err) {
    // Release any locks we already acquired
    if (acquiredLocks.length > 0) {
      await releaseSeatLocks(showId, acquiredLocks, userId);
    }
    throw err;
  }

  // All locks acquired — create reservation in a transaction
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const expiresAt = new Date(Date.now() + ttl * 1000);
    const totalAmount = seats.reduce((sum, s) => sum + parseFloat(s.price), 0);

    const resResult = await client.query(
      `INSERT INTO reservations (user_id, show_id, status, total_amount, expires_at, idempotency_key)
       VALUES ($1, $2, 'ACTIVE', $3, $4, $5)
       RETURNING *`,
      [userId, showId, totalAmount, expiresAt, idempotencyKey]
    );
    const reservation = resResult.rows[0];

    for (const seat of seats) {
      await client.query(
        `INSERT INTO reservation_seats (reservation_id, show_seat_id, seat_label, price)
         VALUES ($1, $2, $3, $4)`,
        [reservation.id, seat.id, seat.seat_label, seat.price]
      );

      // Update show_seat status
      await client.query(
        `UPDATE show_seats
         SET status = 'LOCKED', locked_by = $1, locked_at = NOW()
         WHERE id = $2 AND status = 'AVAILABLE'`,
        [userId, seat.id]
      );
    }

    await client.query('COMMIT');

    logger.info('Reservation created', {
      reservationId: reservation.id,
      userId,
      showId,
      seats: seats.map((s) => s.seat_label),
      expiresAt,
    });

    // Real-time broadcast
    try {
      const io = getIO();
      if (io) {
        seats.forEach((seat) => {
          io.to(`show:${showId}`).emit('seat:locked', {
            seatId: seat.id,
            seatLabel: seat.seat_label,
            userId,
            reservationId: reservation.id,
            expiresAt,
          });
        });
      }
    } catch (socketErr) {
      logger.warn('Socket emit failed', { error: socketErr.message });
    }

    // Schedule expiration job (BullMQ)
    try {
      const { scheduleReservationExpiry } = require('../../jobs/queues');
      await scheduleReservationExpiry(reservation.id, ttl * 1000);
    } catch (jobErr) {
      logger.warn('Failed to schedule expiry job', { error: jobErr.message });
    }

    return {
      reservationId: reservation.id,
      showId,
      expiresAt: reservation.expires_at,
      seats: seats.map((s) => ({
        id: s.id,
        label: s.seat_label,
        price: parseFloat(s.price),
      })),
      amount: totalAmount,
      status: 'ACTIVE',
    };
  } catch (err) {
    await client.query('ROLLBACK');
    // Release Redis locks on DB failure
    await releaseSeatLocks(showId, acquiredLocks, userId);
    logger.error('Reservation transaction failed', { error: err.message });
    throw err;
  } finally {
    client.release();
  }
}

async function getReservation(reservationId, userId) {
  const result = await query(
    `SELECT r.*,
      (SELECT json_agg(json_build_object(
        'seatLabel', rs.seat_label,
        'price', rs.price,
        'showSeatId', rs.show_seat_id
      )) FROM reservation_seats rs WHERE rs.reservation_id = r.id) as seats
     FROM reservations r
     WHERE r.id = $1 AND r.user_id = $2`,
    [reservationId, userId]
  );
  if (result.rows.length === 0) {
    throw new AppError('Reservation not found', 404, 'RESERVATION_NOT_FOUND');
  }
  return formatReservation(result.rows[0]);
}

async function cancelReservation(reservationId, userId) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const resResult = await client.query(
      `SELECT * FROM reservations WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [reservationId, userId]
    );
    if (resResult.rows.length === 0) {
      throw new AppError('Reservation not found', 404, 'RESERVATION_NOT_FOUND');
    }
    const reservation = resResult.rows[0];
    if (reservation.status !== 'ACTIVE') {
      throw new AppError('Reservation is not active', 400, 'RESERVATION_NOT_ACTIVE');
    }

    // Get seats
    const seatsResult = await client.query(
      `SELECT show_seat_id, seat_label FROM reservation_seats WHERE reservation_id = $1`,
      [reservationId]
    );
    const seatIds = seatsResult.rows.map((r) => r.show_seat_id);

    // Update reservation
    await client.query(
      `UPDATE reservations SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`,
      [reservationId]
    );

    // Release seats in DB
    await client.query(
      `UPDATE show_seats
       SET status = 'AVAILABLE', locked_by = NULL, locked_at = NULL
       WHERE id = ANY($1::uuid[]) AND status = 'LOCKED'`,
      [seatIds]
    );

    await client.query('COMMIT');

    // Release Redis locks
    await releaseSeatLocks(reservation.show_id, seatIds, userId);

    // Broadcast
    try {
      const io = getIO();
      if (io) {
        seatsResult.rows.forEach((s) => {
          io.to(`show:${reservation.show_id}`).emit('seat:released', {
            seatId: s.show_seat_id,
            seatLabel: s.seat_label,
          });
        });
      }
    } catch (e) {
      /* ignore */
    }

    logger.info('Reservation cancelled', { reservationId, userId });
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Called by BullMQ worker when reservation TTL expires
 */
async function expireReservation(reservationId) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const resResult = await client.query(
      `SELECT * FROM reservations WHERE id = $1 AND status = 'ACTIVE' FOR UPDATE`,
      [reservationId]
    );
    if (resResult.rows.length === 0) {
      await client.query('COMMIT');
      return; // already handled
    }
    const reservation = resResult.rows[0];

    const seatsResult = await client.query(
      `SELECT show_seat_id, seat_label FROM reservation_seats WHERE reservation_id = $1`,
      [reservationId]
    );
    const seatIds = seatsResult.rows.map((r) => r.show_seat_id);

    await client.query(
      `UPDATE reservations SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1`,
      [reservationId]
    );

    await client.query(
      `UPDATE show_seats
       SET status = 'AVAILABLE', locked_by = NULL, locked_at = NULL
       WHERE id = ANY($1::uuid[]) AND status = 'LOCKED'`,
      [seatIds]
    );

    await client.query('COMMIT');

    // Release Redis locks
    await releaseSeatLocks(reservation.show_id, seatIds, reservation.user_id);

    // Broadcast
    try {
      const io = getIO();
      if (io) {
        io.to(`show:${reservation.show_id}`).emit('reservation:expired', {
          reservationId,
          seats: seatsResult.rows.map((s) => ({
            seatId: s.show_seat_id,
            seatLabel: s.seat_label,
          })),
        });
        seatsResult.rows.forEach((s) => {
          io.to(`show:${reservation.show_id}`).emit('seat:released', {
            seatId: s.show_seat_id,
            seatLabel: s.seat_label,
          });
        });
      }
    } catch (e) {
      /* ignore */
    }

    logger.info('Reservation expired', { reservationId });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Expire reservation failed', { reservationId, error: err.message });
    throw err;
  } finally {
    client.release();
  }
}

function formatReservation(row) {
  return {
    reservationId: row.id,
    showId: row.show_id,
    status: row.status,
    amount: parseFloat(row.total_amount),
    expiresAt: row.expires_at,
    seats: row.seats || [],
    createdAt: row.created_at,
  };
}

module.exports = {
  createReservation,
  getReservation,
  cancelReservation,
  expireReservation,
};
