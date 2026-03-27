'use strict';

const settings = {
  reset_cooldown: 60,        // seconds
  negotiation_window: 900,   // seconds (15 minutes)
  job_start_window: 168,     // hours (1 week)
  availability_timeout: 300, // seconds (5 minutes)
  jwt_secret: 'dental-platform-jwt-secret-csc309-2026',
};

// In-memory rate limiter for password reset (IP -> timestamp ms)
const resetCooldowns = new Map();

function isRateLimited(ip) {
  const last = resetCooldowns.get(ip);
  if (!last) return false;
  return (Date.now() - last) / 1000 < settings.reset_cooldown;
}

function setRateLimitTimestamp(ip) {
  resetCooldowns.set(ip, Date.now());
}

module.exports = { settings, isRateLimited, setRateLimitTimestamp };
