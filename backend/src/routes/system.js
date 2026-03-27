'use strict';

const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth');
const { settings } = require('../config/settings');

// PATCH /system/reset-cooldown
router.patch('/reset-cooldown', requireRole('admin'), (req, res) => {
  const { reset_cooldown } = req.body;
  if (reset_cooldown === undefined || typeof reset_cooldown !== 'number') {
    return res.status(400).json({ error: 'reset_cooldown must be a number' });
  }
  if (reset_cooldown < 0) return res.status(400).json({ error: 'reset_cooldown must be >= 0' });
  settings.reset_cooldown = reset_cooldown;
  return res.json({ reset_cooldown });
});

// PATCH /system/negotiation-window
router.patch('/negotiation-window', requireRole('admin'), (req, res) => {
  const { negotiation_window } = req.body;
  if (negotiation_window === undefined || typeof negotiation_window !== 'number') {
    return res.status(400).json({ error: 'negotiation_window must be a number' });
  }
  if (negotiation_window <= 0) return res.status(400).json({ error: 'negotiation_window must be > 0' });
  settings.negotiation_window = negotiation_window;
  return res.json({ negotiation_window });
});

// PATCH /system/job-start-window
router.patch('/job-start-window', requireRole('admin'), (req, res) => {
  const { job_start_window } = req.body;
  if (job_start_window === undefined || typeof job_start_window !== 'number') {
    return res.status(400).json({ error: 'job_start_window must be a number' });
  }
  if (job_start_window <= 0) return res.status(400).json({ error: 'job_start_window must be > 0' });
  settings.job_start_window = job_start_window;
  return res.json({ job_start_window });
});

// PATCH /system/availability-timeout
router.patch('/availability-timeout', requireRole('admin'), (req, res) => {
  const { availability_timeout } = req.body;
  if (availability_timeout === undefined || typeof availability_timeout !== 'number') {
    return res.status(400).json({ error: 'availability_timeout must be a number' });
  }
  if (availability_timeout <= 0) return res.status(400).json({ error: 'availability_timeout must be > 0' });
  settings.availability_timeout = availability_timeout;
  return res.json({ availability_timeout });
});

module.exports = router;
