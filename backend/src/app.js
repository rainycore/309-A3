'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const { authenticate } = require('./middleware/auth');

const authRoutes          = require('./routes/auth');
const userRoutes          = require('./routes/users');
const businessRoutes      = require('./routes/businesses');
const positionTypeRoutes  = require('./routes/positionTypes');
const qualificationRoutes = require('./routes/qualifications');
const systemRoutes        = require('./routes/system');
const jobRoutes           = require('./routes/jobs');
const negotiationRoutes   = require('./routes/negotiations');

function create_app() {
  const app = express();

  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:4173', process.env.FRONTEND_URL].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));
  app.use(express.json());

  // Attach JWT payload to req.auth when a valid token is present (non-blocking)
  app.use(authenticate);

  // Serve uploaded files as static assets
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Route handlers
  app.use('/auth', authRoutes);
  app.use('/users', userRoutes);
  app.use('/businesses', businessRoutes);
  app.use('/position-types', positionTypeRoutes);
  app.use('/qualifications', qualificationRoutes);
  app.use('/system', systemRoutes);
  // 405 guards must come BEFORE the '/' routers so unsupported methods are caught
  // before the router's own catch-alls can be bypassed
  app.all('/jobs', (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') return next();
    return res.status(405).json({ error: 'Method Not Allowed' });
  });
  app.all('/interests', (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') return next();
    return res.status(405).json({ error: 'Method Not Allowed' });
  });

  app.use('/', jobRoutes);         // /jobs/*, /businesses/me/jobs/*
  app.use('/', negotiationRoutes); // /jobs/:id/negotiations, /negotiations/:id

  return app;
}

module.exports = { create_app };
