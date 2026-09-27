/**
 * Socket.IO real-time seat updates
 *
 * Clients join room: show:{showId}
 * Events emitted:
 *   seat:locked, seat:released, seat:booked, reservation:expired, booking:confirmed
 */
const { Server } = require('socket.io');
const logger = require('../utils/logger');
const env = require('../config/environment');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    logger.info('Socket connected', { socketId: socket.id });

    socket.on('join:show', (showId) => {
      if (!showId) return;
      socket.join(`show:${showId}`);
      logger.debug('Client joined show room', { socketId: socket.id, showId });
    });

    socket.on('leave:show', (showId) => {
      if (!showId) return;
      socket.leave(`show:${showId}`);
    });

    socket.on('disconnect', () => {
      logger.debug('Socket disconnected', { socketId: socket.id });
    });
  });

  logger.info('Socket.IO initialized');
  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
