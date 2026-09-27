const Redis = require('ioredis');
const env = require('./environment');
const logger = require('../utils/logger');

let redis = null;
let subscriber = null;

function createRedisClient(name = 'main') {
  const client = new Redis(env.redisUrl, {
    maxRetriesPerRequest: null, // required for BullMQ
    enableReadyCheck: true,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  client.on('connect', () => logger.info(`Redis (${name}) connected`));
  client.on('error', (err) => logger.error(`Redis (${name}) error`, { error: err.message }));
  client.on('close', () => logger.warn(`Redis (${name}) connection closed`));

  return client;
}

function getRedis() {
  if (!redis) {
    redis = createRedisClient('main');
  }
  return redis;
}

function getSubscriber() {
  if (!subscriber) {
    subscriber = createRedisClient('subscriber');
  }
  return subscriber;
}

/**
 * Distributed seat lock using Redis SET NX EX
 * Key: seat-lock:{showId}:{seatId}
 * Value: userId
 * TTL: SEAT_LOCK_TTL_SECONDS
 */
async function acquireSeatLock(showId, seatId, userId, ttlSeconds) {
  const key = `seat-lock:${showId}:${seatId}`;
  const result = await getRedis().set(key, userId, 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}

async function releaseSeatLock(showId, seatId, userId) {
  const key = `seat-lock:${showId}:${seatId}`;
  // Lua script for safe release (only if owned by user)
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  return getRedis().eval(script, 1, key, userId);
}

async function releaseSeatLocks(showId, seatIds, userId) {
  const results = await Promise.all(
    seatIds.map((seatId) => releaseSeatLock(showId, seatId, userId))
  );
  return results;
}

async function getSeatLock(showId, seatId) {
  const key = `seat-lock:${showId}:${seatId}`;
  return getRedis().get(key);
}

async function isSeatLocked(showId, seatId) {
  const val = await getSeatLock(showId, seatId);
  return val !== null;
}

async function extendSeatLock(showId, seatId, userId, ttlSeconds) {
  const key = `seat-lock:${showId}:${seatId}`;
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("expire", KEYS[1], ARGV[2])
    else
      return 0
    end
  `;
  return getRedis().eval(script, 1, key, userId, ttlSeconds);
}

async function cacheGet(key) {
  const val = await getRedis().get(key);
  return val ? JSON.parse(val) : null;
}

async function cacheSet(key, value, ttlSeconds = 300) {
  await getRedis().set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

async function cacheDel(key) {
  await getRedis().del(key);
}

async function disconnectRedis() {
  if (redis) await redis.quit();
  if (subscriber) await subscriber.quit();
  redis = null;
  subscriber = null;
}

module.exports = {
  getRedis,
  getSubscriber,
  createRedisClient,
  acquireSeatLock,
  releaseSeatLock,
  releaseSeatLocks,
  getSeatLock,
  isSeatLocked,
  extendSeatLock,
  cacheGet,
  cacheSet,
  cacheDel,
  disconnectRedis,
};
