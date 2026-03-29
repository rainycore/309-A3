'use strict';

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { settings, isRateLimited, setRateLimitTimestamp } = require('../config/settings');
const { isValidEmail, isValidPassword } = require('../utils/helpers');

const prisma = new PrismaClient();

// POST /auth/resets – Request a password reset token
router.post('/resets', async (req, res) => {
  const ip = req.ip;

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait before requesting another reset.' });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  setRateLimitTimestamp(ip);

  const account = await prisma.account.findUnique({ where: { email } });

  if (!account) {
    // Do not reveal whether account exists; return plausible token
    const fakeToken = uuidv4();
    const fakeExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return res.status(202).json({ expiresAt: fakeExpiry.toISOString(), resetToken: fakeToken });
  }

  const resetToken = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.account.update({
    where: { id: account.id },
    data: { resetToken, resetTokenExpiresAt: expiresAt },
  });

  return res.status(202).json({ expiresAt: expiresAt.toISOString(), resetToken });
});

// POST /auth/resets/:resetToken – Activate account or reset password
router.post('/resets/:resetToken', async (req, res) => {
  const { resetToken } = req.params;
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  const account = await prisma.account.findUnique({ where: { resetToken } });

  if (!account) {
    return res.status(401).json({ error: 'Invalid or expired reset token' });
  }

  if (account.email !== email) {
    return res.status(401).json({ error: 'Email does not match the reset token' });
  }

  if (new Date() > new Date(account.resetTokenExpiresAt)) {
    return res.status(410).json({ error: 'Reset token has expired' });
  }

  const updateData = {
    activated: true,
    resetToken: null,
    resetTokenExpiresAt: null,
  };

  if (password !== undefined) {
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Invalid password format' });
    }
    if (await bcrypt.compare(password, account.password)) {
      return res.status(400).json({ error: 'New password must be different from your current password' });
    }
    updateData.password = await bcrypt.hash(password, 10);
  }

  const updated = await prisma.account.update({ where: { id: account.id }, data: updateData });

  return res.status(200).json({ id: updated.id, email: updated.email, activated: updated.activated, role: updated.role });
});

router.all('/resets/:resetToken', (_req, res) => res.status(405).json({ error: 'Method Not Allowed' }));
router.all('/resets', (_req, res) => res.status(405).json({ error: 'Method Not Allowed' }));

// POST /auth/tokens – Login and get JWT
router.post('/tokens', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const account = await prisma.account.findUnique({ where: { email } });

  if (!account || !(await bcrypt.compare(password, account.password))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!account.activated) {
    return res.status(403).json({ error: 'Account is not activated' });
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const token = jwt.sign({ id: account.id, role: account.role }, settings.jwt_secret, { expiresIn: '24h' });

  // Update inactivity timer for regular users on login
  if (account.role === 'regular') {
    await prisma.regularUser.update({
      where: { id: account.id },
      data: { lastActiveAt: new Date() },
    });
  }

  return res.status(200).json({ token, expiresAt: expiresAt.toISOString() });
});

router.all('/tokens', (_req, res) => res.status(405).json({ error: 'Method Not Allowed' }));

module.exports = router;
