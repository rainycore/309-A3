'use strict';

const { expressjwt } = require('express-jwt');
const { settings } = require('../config/settings');

// Attach req.auth if a valid JWT is present; does NOT reject missing tokens
const authenticate = expressjwt({
  secret: settings.jwt_secret,
  algorithms: ['HS256'],
  credentialsRequired: false,
});

function requireAuth(req, res, next) {
  if (!req.auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { authenticate, requireAuth, requireRole };
