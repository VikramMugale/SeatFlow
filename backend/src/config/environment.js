require('dotenv').config();

function resolveRedisUrl(value) {
  let redisUrl = value || 'redis://:seatflow_redis@localhost:6379';
  const cliCommand = redisUrl.match(/^(?:redis:\/\/)?redis-cli\s+-u\s+(rediss?:\/\/\S+)$/i);

  if (cliCommand) {
    console.warn('REDIS_URL contains a redis-cli command; using the URL after "-u". Set REDIS_URL to that URL only.');
    redisUrl = cliCommand[1];
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(redisUrl);
  } catch {
    throw new Error('Invalid REDIS_URL. Use a raw redis:// or rediss:// URL without redis-cli arguments.');
  }

  if (!['redis:', 'rediss:'].includes(parsedUrl.protocol) || !parsedUrl.hostname) {
    throw new Error('Invalid REDIS_URL. Use a raw redis:// or rediss:// URL without redis-cli arguments.');
  }

  return redisUrl;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://seatflow:seatflow_secret@localhost:5432/seatflow',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://seatflow:seatflow_secret@localhost:27017/seatflow?authSource=admin',
  redisUrl: resolveRedisUrl(process.env.REDIS_URL),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret_change_me_32chars!!',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me_32chars!',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  seatLockTtlSeconds: parseInt(process.env.SEAT_LOCK_TTL_SECONDS || '300', 10),
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder',
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  logLevel: process.env.LOG_LEVEL || 'info',
};

module.exports = env;
