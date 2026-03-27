'use strict';

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { settings } = require('./config/settings');

const prisma = new PrismaClient();

function attach_sockets(server) {
  const io = new Server(server, { cors: { origin: '*' } });

  // Authenticate JWT on connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.user = jwt.verify(token, settings.jwt_secret);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, role } = socket.user;

    // Client joins a negotiation room by sending their negotiation ID
    socket.on('join_negotiation', async (data) => {
      const negId = parseInt(data?.negotiation_id);
      if (isNaN(negId)) return;

      const neg = await prisma.negotiation.findUnique({
        where: { id: negId },
        include: { job: true },
      });
      if (!neg) return;

      const isCandidate = role === 'regular' && neg.userId === userId;
      const isBusiness  = role === 'business' && neg.job.businessId === userId;
      if (!isCandidate && !isBusiness) return;

      socket.join(`negotiation:${negId}`);
      socket.emit('joined', { negotiation_id: negId });
    });

    // Relay chat messages within a negotiation room (not persisted)
    socket.on('chat_message', (data) => {
      const negId = parseInt(data?.negotiation_id);
      if (isNaN(negId)) return;
      const room = `negotiation:${negId}`;
      if (!socket.rooms.has(room)) return;

      io.to(room).emit('chat_message', {
        negotiation_id: negId,
        sender_id: userId,
        sender_role: role,
        message: data.message,
        timestamp: new Date().toISOString(),
      });
    });
  });

  return io;
}

module.exports = { attach_sockets };
