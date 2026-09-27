const express = require('express');
const router = express.Router();

const authRoutes = require('../modules/auth/auth.routes');
const eventRoutes = require('../modules/events/event.routes');
const venueRoutes = require('../modules/venues/venue.routes');
const showRoutes = require('../modules/shows/show.routes');
const seatRoutes = require('../modules/seats/seat.routes');
const reservationRoutes = require('../modules/reservations/reservation.routes');
const bookingRoutes = require('../modules/bookings/booking.routes');
const paymentRoutes = require('../modules/payments/payment.routes');
const userRoutes = require('../modules/users/user.routes');

router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/venues', venueRoutes);
router.use('/shows', showRoutes);
router.use('/shows', seatRoutes); // GET /shows/:showId/seats
router.use('/reservations', reservationRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/users', userRoutes);

// Health
router.get('/health', async (req, res) => {
  const { query } = require('../config/database');
  const { getRedis } = require('../config/redis');
  const mongoose = require('mongoose');

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      api: true,
      postgres: false,
      mongodb: false,
      redis: false,
    },
  };

  try {
    await query('SELECT 1');
    health.services.postgres = true;
  } catch (e) {
    health.status = 'degraded';
  }

  try {
    health.services.mongodb = mongoose.connection.readyState === 1;
  } catch (e) {
    health.services.mongodb = false;
  }

  try {
    const pong = await getRedis().ping();
    health.services.redis = pong === 'PONG';
    if (!health.services.redis) health.status = 'degraded';
  } catch (e) {
    health.status = 'degraded';
  }

  const code = health.status === 'ok' ? 200 : 503;
  res.status(code).json(health);
});

router.get('/ready', (req, res) => {
  res.json({ ready: true });
});

module.exports = router;
