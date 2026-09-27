/**
 * Payment Service with Idempotent Webhook Processing
 *
 * Source of truth for payment confirmation is the webhook, not the frontend callback.
 */
const crypto = require('crypto');
const { query, getClient } = require('../../config/database');
const { releaseSeatLocks } = require('../../config/redis');
const { generateBookingCode } = require('../../utils/tokens');
const { AppError } = require('../../middleware/errorHandler');
const env = require('../../config/environment');
const logger = require('../../utils/logger');
const { getIO } = require('../../sockets/seat.socket');

async function createPaymentOrder(userId, { reservationId }) {
  const resResult = await query(
    `SELECT r.*, 
      (SELECT json_agg(json_build_object('showSeatId', rs.show_seat_id, 'seatLabel', rs.seat_label, 'price', rs.price))
       FROM reservation_seats rs WHERE rs.reservation_id = r.id) as seats
     FROM reservations r
     WHERE r.id = $1 AND r.user_id = $2 AND r.status = 'ACTIVE'`,
    [reservationId, userId]
  );
  if (resResult.rows.length === 0) {
    throw new AppError('Active reservation not found', 404, 'RESERVATION_NOT_FOUND');
  }
  const reservation = resResult.rows[0];

  if (new Date(reservation.expires_at) < new Date()) {
    throw new AppError('Reservation has expired', 400, 'RESERVATION_EXPIRED');
  }

  // Create payment record
  const gatewayOrderId = `ord_${crypto.randomBytes(12).toString('hex')}`;
  const result = await query(
    `INSERT INTO payments (reservation_id, user_id, amount, currency, status, gateway, gateway_order_id)
     VALUES ($1, $2, $3, 'INR', 'PENDING', 'stripe', $4)
     RETURNING *`,
    [reservationId, userId, reservation.total_amount, gatewayOrderId]
  );
  const payment = result.rows[0];

  // In production: call Stripe/Razorpay to create order
  // Here we simulate a payment intent
  return {
    paymentId: payment.id,
    orderId: gatewayOrderId,
    amount: parseFloat(payment.amount),
    currency: payment.currency,
    // Client would use this with Stripe.js / Razorpay checkout
    clientSecret: `pi_sim_${gatewayOrderId}_secret`,
    reservationId,
    expiresAt: reservation.expires_at,
  };
}

/**
 * Idempotent webhook processor
 */
async function processWebhook(payload, signature) {
  // Verify signature (simplified — in production use Stripe's constructEvent)
  if (env.stripe.webhookSecret && env.stripe.webhookSecret !== 'whsec_placeholder') {
    // const expected = crypto.createHmac('sha256', env.stripe.webhookSecret)...
    // For demo we accept all
  }

  const eventId = payload.id || payload.eventId || `evt_${Date.now()}`;
  const eventType = payload.type || payload.eventType || 'payment.success';
  const paymentRef = payload.data?.object?.id || payload.paymentId || payload.gatewayPaymentId;

  // Idempotency check
  const existing = await query(
    'SELECT id FROM processed_webhooks WHERE event_id = $1',
    [eventId]
  );
  if (existing.rows.length > 0) {
    logger.info('Webhook already processed (idempotent)', { eventId });
    return { status: 'already_processed', eventId };
  }

  if (eventType === 'payment.success' || eventType === 'payment_intent.succeeded') {
    return confirmPayment(eventId, eventType, payload, paymentRef);
  }

  if (eventType === 'payment.failed' || eventType === 'payment_intent.payment_failed') {
    return handlePaymentFailure(eventId, eventType, payload, paymentRef);
  }

  // Record unknown events
  await query(
    `INSERT INTO processed_webhooks (event_id, event_type, payload, status)
     VALUES ($1, $2, $3, 'IGNORED')`,
    [eventId, eventType, JSON.stringify(payload)]
  );
  return { status: 'ignored', eventId };
}

async function confirmPayment(eventId, eventType, payload, gatewayPaymentId) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Find payment by gateway order or payment id
    const orderId = payload.data?.object?.metadata?.orderId ||
                    payload.orderId ||
                    payload.gatewayOrderId;

    let paymentResult;
    if (orderId) {
      paymentResult = await client.query(
        `SELECT * FROM payments WHERE gateway_order_id = $1 FOR UPDATE`,
        [orderId]
      );
    } else if (gatewayPaymentId) {
      paymentResult = await client.query(
        `SELECT * FROM payments WHERE gateway_payment_id = $1 OR id::text = $1 FOR UPDATE`,
        [gatewayPaymentId]
      );
    }

    if (!paymentResult || paymentResult.rows.length === 0) {
      // Try by reservation from metadata
      const reservationId = payload.data?.object?.metadata?.reservationId || payload.reservationId;
      if (reservationId) {
        paymentResult = await client.query(
          `SELECT * FROM payments WHERE reservation_id = $1 AND status = 'PENDING' FOR UPDATE`,
          [reservationId]
        );
      }
    }

    if (!paymentResult || paymentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new AppError('Payment not found for webhook', 404, 'PAYMENT_NOT_FOUND');
    }

    const payment = paymentResult.rows[0];
    if (payment.status === 'SUCCESS') {
      // Already confirmed — still record webhook for idempotency
      await client.query(
        `INSERT INTO processed_webhooks (event_id, payment_id, event_type, payload, status)
         VALUES ($1, $2, $3, $4, 'ALREADY_CONFIRMED')
         ON CONFLICT (event_id) DO NOTHING`,
        [eventId, payment.id, eventType, JSON.stringify(payload)]
      );
      await client.query('COMMIT');
      return { status: 'already_confirmed', paymentId: payment.id };
    }

    // Update payment
    await client.query(
      `UPDATE payments SET status = 'SUCCESS', gateway_payment_id = $1, gateway_response = $2, updated_at = NOW()
       WHERE id = $3`,
      [gatewayPaymentId || payment.gateway_payment_id, JSON.stringify(payload), payment.id]
    );

    // Get reservation
    const resResult = await client.query(
      `SELECT * FROM reservations WHERE id = $1 FOR UPDATE`,
      [payment.reservation_id]
    );
    if (resResult.rows.length === 0) {
      throw new AppError('Reservation not found', 404);
    }
    const reservation = resResult.rows[0];

    // Create booking
    const bookingCode = generateBookingCode();
    const convenienceFee = Math.round(parseFloat(reservation.total_amount) * 0.06 * 100) / 100;
    const tax = Math.round(parseFloat(reservation.total_amount) * 0.18 * 100) / 100;
    const totalWithFees = parseFloat(reservation.total_amount) + convenienceFee + tax;

    const bookingResult = await client.query(
      `INSERT INTO bookings (booking_code, user_id, show_id, reservation_id, status, total_amount, convenience_fee, tax, payment_id)
       VALUES ($1, $2, $3, $4, 'CONFIRMED', $5, $6, $7, $8)
       RETURNING *`,
      [
        bookingCode,
        reservation.user_id,
        reservation.show_id,
        reservation.id,
        totalWithFees,
        convenienceFee,
        tax,
        payment.id,
      ]
    );
    const booking = bookingResult.rows[0];

    // Get reservation seats and mark as BOOKED
    const seatsResult = await client.query(
      `SELECT rs.show_seat_id, rs.seat_label, rs.price FROM reservation_seats rs WHERE rs.reservation_id = $1`,
      [reservation.id]
    );

    for (const seat of seatsResult.rows) {
      await client.query(
        `INSERT INTO booking_seats (booking_id, show_seat_id, seat_label, price)
         VALUES ($1, $2, $3, $4)`,
        [booking.id, seat.show_seat_id, seat.seat_label, seat.price]
      );
      await client.query(
        `UPDATE show_seats SET status = 'BOOKED', booked_by = $1, locked_by = NULL, locked_at = NULL
         WHERE id = $2`,
        [reservation.user_id, seat.show_seat_id]
      );
    }

    // Convert reservation
    await client.query(
      `UPDATE reservations SET status = 'CONVERTED', updated_at = NOW() WHERE id = $1`,
      [reservation.id]
    );

    // Record webhook
    await client.query(
      `INSERT INTO processed_webhooks (event_id, payment_id, event_type, payload, status)
       VALUES ($1, $2, $3, $4, 'PROCESSED')`,
      [eventId, payment.id, eventType, JSON.stringify(payload)]
    );

    await client.query('COMMIT');

    // Release Redis locks (seats are now BOOKED in DB)
    const seatIds = seatsResult.rows.map((s) => s.show_seat_id);
    await releaseSeatLocks(reservation.show_id, seatIds, reservation.user_id);

    // Real-time
    try {
      const io = getIO();
      if (io) {
        seatsResult.rows.forEach((s) => {
          io.to(`show:${reservation.show_id}`).emit('seat:booked', {
            seatId: s.show_seat_id,
            seatLabel: s.seat_label,
            bookingId: booking.id,
          });
        });
        io.to(`show:${reservation.show_id}`).emit('booking:confirmed', {
          bookingId: booking.id,
          bookingCode: booking.booking_code,
        });
      }
    } catch (e) {
      /* ignore */
    }

    // Queue notification & ticket generation
    try {
      const { addNotificationJob, addTicketJob } = require('../../jobs/queues');
      await addNotificationJob({
        type: 'BOOKING_CONFIRMED',
        userId: reservation.user_id,
        bookingId: booking.id,
        bookingCode: booking.booking_code,
      });
      await addTicketJob({ bookingId: booking.id });
    } catch (jobErr) {
      logger.warn('Failed to queue post-booking jobs', { error: jobErr.message });
    }

    logger.info('Payment confirmed & booking created', {
      bookingId: booking.id,
      bookingCode: booking.booking_code,
      paymentId: payment.id,
    });

    return {
      status: 'confirmed',
      bookingId: booking.id,
      bookingCode: booking.booking_code,
      paymentId: payment.id,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Webhook confirm failed', { eventId, error: err.message });
    throw err;
  } finally {
    client.release();
  }
}

async function handlePaymentFailure(eventId, eventType, payload, gatewayPaymentId) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const orderId = payload.orderId || payload.gatewayOrderId || payload.data?.object?.metadata?.orderId;
    let paymentResult;
    if (orderId) {
      paymentResult = await client.query(
        `SELECT * FROM payments WHERE gateway_order_id = $1 FOR UPDATE`,
        [orderId]
      );
    }

    if (paymentResult && paymentResult.rows.length > 0) {
      const payment = paymentResult.rows[0];
      await client.query(
        `UPDATE payments SET status = 'FAILED', gateway_response = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(payload), payment.id]
      );

      // Cancel reservation and release seats
      if (payment.reservation_id) {
        const resResult = await client.query(
          `SELECT * FROM reservations WHERE id = $1 AND status = 'ACTIVE' FOR UPDATE`,
          [payment.reservation_id]
        );
        if (resResult.rows.length > 0) {
          const reservation = resResult.rows[0];
          const seatsResult = await client.query(
            `SELECT show_seat_id FROM reservation_seats WHERE reservation_id = $1`,
            [reservation.id]
          );
          const seatIds = seatsResult.rows.map((r) => r.show_seat_id);

          await client.query(
            `UPDATE reservations SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`,
            [reservation.id]
          );
          await client.query(
            `UPDATE show_seats SET status = 'AVAILABLE', locked_by = NULL, locked_at = NULL
             WHERE id = ANY($1::uuid[]) AND status = 'LOCKED'`,
            [seatIds]
          );

          await releaseSeatLocks(reservation.show_id, seatIds, reservation.user_id);

          try {
            const io = getIO();
            if (io) {
              seatsResult.rows.forEach((s) => {
                io.to(`show:${reservation.show_id}`).emit('seat:released', {
                  seatId: s.show_seat_id,
                });
              });
            }
          } catch (e) { /* ignore */ }
        }
      }
    }

    await client.query(
      `INSERT INTO processed_webhooks (event_id, event_type, payload, status)
       VALUES ($1, $2, $3, 'PROCESSED')
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId, eventType, JSON.stringify(payload)]
    );

    await client.query('COMMIT');
    return { status: 'payment_failed_handled', eventId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getPayment(id, userId) {
  const result = await query(
    `SELECT p.*, b.booking_code, b.status as booking_status
     FROM payments p
     LEFT JOIN bookings b ON b.payment_id = p.id
     WHERE p.id = $1 AND p.user_id = $2`,
    [id, userId]
  );
  if (result.rows.length === 0) throw new AppError('Payment not found', 404);
  return result.rows[0];
}

module.exports = {
  createPaymentOrder,
  processWebhook,
  getPayment,
};
