const { Queue } = require('bullmq');
const { createRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

const connection = createRedisClient('bullmq');

const bookingQueue = new Queue('booking', { connection });
const paymentQueue = new Queue('payment', { connection });
const notificationQueue = new Queue('notification', { connection });
const ticketQueue = new Queue('ticket', { connection });
const cleanupQueue = new Queue('cleanup', { connection });

async function scheduleReservationExpiry(reservationId, delayMs) {
  await bookingQueue.add(
    'expire-reservation',
    { reservationId },
    {
      delay: delayMs,
      jobId: `expire-${reservationId}`,
      removeOnComplete: true,
      removeOnFail: 100,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    }
  );
  logger.info('Scheduled reservation expiry', { reservationId, delayMs });
}

async function addNotificationJob(data) {
  await notificationQueue.add('send-notification', data, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 100,
  });
}

async function addTicketJob(data) {
  await ticketQueue.add('generate-ticket', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 50,
  });
}

async function scheduleCleanup() {
  // Repeat every 2 minutes
  await cleanupQueue.add(
    'cleanup-expired',
    {},
    {
      repeat: { every: 2 * 60 * 1000 },
      jobId: 'cleanup-expired-reservations',
      removeOnComplete: true,
    }
  );
}

module.exports = {
  bookingQueue,
  paymentQueue,
  notificationQueue,
  ticketQueue,
  cleanupQueue,
  scheduleReservationExpiry,
  addNotificationJob,
  addTicketJob,
  scheduleCleanup,
  connection,
};
