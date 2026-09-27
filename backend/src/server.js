const http = require('http');
const app = require('./app');
const env = require('./config/environment');
const { connectPostgres, connectMongo, disconnectAll } = require('./config/database');
const { getRedis, disconnectRedis } = require('./config/redis');
const { initSocket } = require('./sockets/seat.socket');
const { startWorkers } = require('./jobs/workers');
const { scheduleCleanup } = require('./jobs/queues');
const logger = require('./utils/logger');

async function start() {
  try {
    const services = {
      postgres: 'connected',
      redis: 'connected',
      mongodb: 'unavailable',
    };

    await connectPostgres();
    try {
      await connectMongo();
      services.mongodb = 'connected';
    } catch (err) {
      logger.warn('MongoDB unavailable; continuing without MongoDB', { error: err.message });
    }
    await getRedis().ping();

    const server = http.createServer(app);
    initSocket(server);

    // Start background workers
    startWorkers();
    await scheduleCleanup();

    logger.info('Service connection status', { services });

    server.listen(env.port, () => {
      logger.info(`SeatFlow API running on port ${env.port}`, {
        env: env.nodeEnv,
        node: process.version,
      });
    });

    const shutdown = async (signal) => {
      logger.info(`${signal} received — shutting down`);
      server.close(async () => {
        await disconnectAll();
        await disconnectRedis();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.error('Failed to start server', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

start();
