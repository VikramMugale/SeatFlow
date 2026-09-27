const { Worker } = require('bullmq');
const { connection } = require('./queues');
const { expireReservation } = require('../modules/reservations/reservation.service');
const { query } = require('../config/database');
const logger = require('../utils/logger');

function startWorkers() {
  // Booking worker — reservation expiry
  const bookingWorker = new Worker(
    'booking',
    async (job) => {
      if (job.name === 'expire-reservation') {
        await expireReservation(job.data.reservationId);
      }
    },
    { connection, concurrency: 5 }
  );

  bookingWorker.on('completed', (job) => {
    logger.info('Booking job completed', { jobId: job.id, name: job.name });
  });
  bookingWorker.on('failed', (job, err) => {
    logger.error('Booking job failed', { jobId: job?.id, error: err.message });
  });

  // Notification worker
  const notificationWorker = new Worker(
    'notification',
    async (job) => {
      const { type, userId, bookingId, bookingCode } = job.data;
      // In production: send email via SES/SendGrid
      logger.info('Notification sent (simulated)', { type, userId, bookingCode });
      // Could store in MongoDB notifications collection
    },
    { connection, concurrency: 10 }
  );

  notificationWorker.on('failed', (job, err) => {
    logger.error('Notification job failed', { jobId: job?.id, error: err.message });
  });

  // Ticket worker
  const ticketWorker = new Worker(
    'ticket',
    async (job) => {
      const { bookingId } = job.data;
      // In production: generate PDF + QR code
      const qrData = `SEATFLOW:${bookingId}`;
      await query(
        `UPDATE bookings SET qr_code = $1, ticket_url = $2, updated_at = NOW() WHERE id = $3`,
        [qrData, `/tickets/${bookingId}.pdf`, bookingId]
      );
      logger.info('Ticket generated (simulated)', { bookingId });
    },
    { connection, concurrency: 5 }
  );

  ticketWorker.on('failed', (job, err) => {
    logger.error('Ticket job failed', { jobId: job?.id, error: err.message });
  });

  // Cleanup worker — catch any expired reservations missed by delayed jobs
  const cleanupWorker = new Worker(
    'cleanup',
    async () => {
      const result = await query(
        `SELECT id FROM reservations WHERE status = 'ACTIVE' AND expires_at < NOW()`
      );
      for (const row of result.rows) {
        try {
          await expireReservation(row.id);
        } catch (err) {
          logger.error('Cleanup expire failed', { reservationId: row.id, error: err.message });
        }
      }
      if (result.rows.length > 0) {
        logger.info('Cleanup processed expired reservations', { count: result.rows.length });
      }
    },
    { connection, concurrency: 1 }
  );

  logger.info('BullMQ workers started');
  return { bookingWorker, notificationWorker, ticketWorker, cleanupWorker };
}

module.exports = { startWorkers };
