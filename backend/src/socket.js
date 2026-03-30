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
      try {
        const negId = parseInt(data?.negotiation_id);
        if (isNaN(negId)) return;

        const neg = await prisma.negotiation.findUnique({
          where: { id: negId },
          include: { job: true, messages: { orderBy: { createdAt: 'asc' } } },
        });
        if (!neg) return;

        const isCandidate = role === 'regular' && neg.userId === userId;
        const isBusiness  = role === 'business' && neg.job.businessId === userId;
        if (!isCandidate && !isBusiness) return;

        socket.join(`negotiation:${negId}`);

        // Send message history to the joining client
        const history = neg.messages.map(m => ({
          negotiation_id: negId,
          sender_id: m.senderId,
          sender_role: m.senderRole,
          message: m.message,
          timestamp: m.createdAt.toISOString(),
        }));
        socket.emit('joined', { negotiation_id: negId, history });
      } catch (err) {
        console.error('join_negotiation error:', err);
      }
    });

    // Relay and persist chat messages within a negotiation room
    socket.on('chat_message', async (data) => {
      try {
        const negId = parseInt(data?.negotiation_id);
        if (isNaN(negId)) return;
        const room = `negotiation:${negId}`;
        if (!socket.rooms.has(room)) return;

        const saved = await prisma.message.create({
          data: {
            negotiationId: negId,
            senderId: userId,
            senderRole: role,
            message: data.message,
          },
        });

        io.to(room).emit('chat_message', {
          negotiation_id: negId,
          sender_id: userId,
          sender_role: role,
          message: data.message,
          timestamp: saved.createdAt.toISOString(),
        });
      } catch (err) {
        console.error('chat_message error:', err);
      }
    });
  });

  return io;
}

module.exports = { attach_sockets };
