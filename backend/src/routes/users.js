'use strict';

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireRole } = require('../middleware/auth');
const { isValidEmail, isValidPassword, getEffectiveStatus } = require('../utils/helpers');
const { settings } = require('../config/settings');

const prisma = new PrismaClient();

// ── helpers ───────────────────────────────────────────────────────────────────

function makeAvatarUpload(userId) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join('uploads', 'users', String(userId));
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `avatar${ext}`);
    },
  });
  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') cb(null, true);
      else { req.fileTypeError = 'Only image/png and image/jpeg are allowed'; cb(null, false); }
    },
  });
}

function makeResumeUpload(userId) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join('uploads', 'users', String(userId));
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, 'resume.pdf'),
  });
  return multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') cb(null, true);
      else cb(new Error('Only PDF files are allowed'));
    },
  });
}

// ── POST /users ───────────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { first_name, last_name, email, password, phone_number, postal_address, birthday } = req.body;

  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ error: 'first_name, last_name, email, and password are required' });
  }
  if (typeof first_name !== 'string' || typeof last_name !== 'string') {
    return res.status(400).json({ error: 'Invalid field types' });
  }
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email format' });
  if (!isValidPassword(password)) return res.status(400).json({ error: 'Invalid password format' });

  if (birthday !== undefined) {
    if (typeof birthday !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
      return res.status(400).json({ error: 'birthday must be in YYYY-MM-DD format' });
    }
  }

  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

  const hashedPassword = require('bcrypt').hashSync(password, 10);
  const resetToken = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const account = await prisma.account.create({
    data: {
      email,
      password: hashedPassword,
      role: 'regular',
      activated: false,
      resetToken,
      resetTokenExpiresAt: expiresAt,
      regularUser: {
        create: {
          first_name,
          last_name,
          phone_number: phone_number || '',
          postal_address: postal_address || '',
          birthday: birthday || '1970-01-01',
        },
      },
    },
    include: { regularUser: true },
  });

  return res.status(201).json({
    id: account.id,
    first_name: account.regularUser.first_name,
    last_name: account.regularUser.last_name,
    email: account.email,
    activated: account.activated,
    role: account.role,
    phone_number: account.regularUser.phone_number,
    postal_address: account.regularUser.postal_address,
    birthday: account.regularUser.birthday,
    createdAt: account.createdAt.toISOString(),
    resetToken: account.resetToken,
    expiresAt: expiresAt.toISOString(),
  });
});

// ── GET /users  (Admin) ───────────────────────────────────────────────────────

router.get('/', requireRole('admin'), async (req, res) => {
  const { keyword, activated, suspended, last_name: lnSort, email: emailSort, page = '1', limit = '10' } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1) {
    return res.status(400).json({ error: 'Invalid pagination parameters' });
  }

  const where = {};
  const accountWhere = { role: 'regular' };

  if (activated !== undefined) accountWhere.activated = activated === 'true';
  where.account = accountWhere;

  if (suspended !== undefined) where.suspended = suspended === 'true';

  if (keyword) {
    where.OR = [
      { first_name: { contains: keyword } },
      { last_name: { contains: keyword } },
      { account: { email: { contains: keyword } } },
      { postal_address: { contains: keyword } },
      { phone_number: { contains: keyword } },
    ];
  }

  const orderBy = [];
  if (lnSort) orderBy.push({ last_name: lnSort === 'desc' ? 'desc' : 'asc' });
  if (emailSort) orderBy.push({ account: { email: emailSort === 'desc' ? 'desc' : 'asc' } });
  if (!orderBy.length) orderBy.push({ id: 'asc' });

  const [total, users] = await Promise.all([
    prisma.regularUser.count({ where }),
    prisma.regularUser.findMany({
      where,
      include: { account: true },
      orderBy,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
  ]);

  return res.json({
    count: total,
    results: users.map((u) => ({
      id: u.id,
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.account.email,
      activated: u.account.activated,
      suspended: u.suspended,
      role: 'regular',
      phone_number: u.phone_number,
      postal_address: u.postal_address,
    })),
  });
});

// ── GET /users/me  (Regular) ──────────────────────────────────────────────────

router.get('/me', requireRole('regular'), async (req, res) => {
  const user = await prisma.regularUser.findUnique({
    where: { id: req.auth.id },
    include: { account: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const inactive = (Date.now() - new Date(user.lastActiveAt).getTime()) / 1000;
  const effectiveAvailable = user.available && !user.suspended && inactive < settings.availability_timeout;

  return res.json({
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.account.email,
    activated: user.account.activated,
    suspended: user.suspended,
    available: effectiveAvailable,
    role: 'regular',
    phone_number: user.phone_number,
    postal_address: user.postal_address,
    birthday: user.birthday,
    createdAt: user.account.createdAt.toISOString(),
    avatar: user.avatar,
    resume: user.resume,
    biography: user.biography,
  });
});

// ── PATCH /users/me  (Regular) ────────────────────────────────────────────────

router.patch('/me', requireRole('regular'), async (req, res) => {
  const allowed = ['first_name', 'last_name', 'phone_number', 'postal_address', 'birthday', 'avatar', 'biography'];
  const body = req.body;

  const extra = Object.keys(body).filter((k) => !allowed.includes(k));
  if (extra.length > 0) return res.status(400).json({ error: `Unexpected fields: ${extra.join(', ')}` });
  if (Object.keys(body).length === 0) return res.status(400).json({ error: 'No fields provided' });

  if (body.birthday !== undefined) {
    if (typeof body.birthday !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.birthday)) {
      return res.status(400).json({ error: 'birthday must be in YYYY-MM-DD format' });
    }
  }

  const data = {};
  for (const k of allowed) {
    if (body[k] !== undefined) data[k] = body[k];
  }

  await prisma.regularUser.update({ where: { id: req.auth.id }, data });
  // Update inactivity timer
  await prisma.regularUser.update({ where: { id: req.auth.id }, data: { lastActiveAt: new Date() } });

  return res.json({ id: req.auth.id, ...data });
});

// ── PATCH /users/me/available  (Regular) ─────────────────────────────────────

router.patch('/me/available', requireRole('regular'), async (req, res) => {
  const { available } = req.body;
  if (available === undefined || typeof available !== 'boolean') {
    return res.status(400).json({ error: 'available must be a boolean' });
  }

  const user = await prisma.regularUser.findUnique({
    where: { id: req.auth.id },
    include: { qualifications: { where: { status: 'approved' } } },
  });

  if (available) {
    if (user.suspended) return res.status(400).json({ error: 'Suspended users cannot be made available' });
    if (user.qualifications.length === 0) {
      return res.status(400).json({ error: 'No approved qualifications' });
    }
  }

  await prisma.regularUser.update({
    where: { id: req.auth.id },
    data: { available, lastActiveAt: new Date() },
  });

  return res.json({ available });
});

// ── PUT /users/me/avatar  (Regular) ──────────────────────────────────────────

router.put('/me/avatar', requireRole('regular'), (req, res) => {
  const upload = makeAvatarUpload(req.auth.id);
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (req.fileTypeError) return res.status(400).json({ error: req.fileTypeError });
    if (!req.file) return res.status(400).json({ error: 'file is required' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const avatarPath = `/uploads/users/${req.auth.id}/avatar${ext}`;
    await prisma.regularUser.update({ where: { id: req.auth.id }, data: { avatar: avatarPath } });
    return res.json({ avatar: avatarPath });
  });
});

// ── PUT /users/me/resume  (Regular) ──────────────────────────────────────────

router.put('/me/resume', requireRole('regular'), (req, res) => {
  const upload = makeResumeUpload(req.auth.id);
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'file is required' });

    const resumePath = `/uploads/users/${req.auth.id}/resume.pdf`;
    await prisma.regularUser.update({ where: { id: req.auth.id }, data: { resume: resumePath } });
    return res.json({ resume: resumePath });
  });
});

// ── PATCH /users/:userId/suspended  (Admin) ───────────────────────────────────

router.patch('/:userId/suspended', requireRole('admin'), async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) return res.status(404).json({ error: 'User not found' });

  const { suspended } = req.body;
  if (suspended === undefined || typeof suspended !== 'boolean') {
    return res.status(400).json({ error: 'suspended must be a boolean' });
  }

  const user = await prisma.regularUser.findUnique({ where: { id: userId }, include: { account: true } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  await prisma.regularUser.update({ where: { id: userId }, data: { suspended } });

  return res.json({
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.account.email,
    activated: user.account.activated,
    suspended,
    role: 'regular',
    phone_number: user.phone_number,
    postal_address: user.postal_address,
  });
});

// ── GET /users/me/invitations  (Regular) ─────────────────────────────────────

router.get('/me/invitations', requireRole('regular'), async (req, res) => {
  const userId = req.auth.id;
  const pageNum = Math.max(1, parseInt(req.query.page) || 1);
  const limitNum = Math.max(1, parseInt(req.query.limit) || 10);

  const now = new Date();
  const expiryThreshold = new Date(now.getTime() + settings.negotiation_window * 1000);

  // Invitations: business invited user (businessInterested=true), user hasn't accepted yet (candidateInterested != true)
  const where = {
    userId,
    businessInterested: true,
    candidateInterested: { not: true },
    job: { status: 'open', start_time: { gt: expiryThreshold } },
  };

  const [total, interests] = await Promise.all([
    prisma.interest.count({ where }),
    prisma.interest.findMany({
      where,
      include: { job: { include: { positionType: true, business: true } } },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
  ]);

  return res.json({
    count: total,
    results: interests.map((i) => ({
      id: i.job.id,
      status: 'open',
      position_type: { id: i.job.positionType.id, name: i.job.positionType.name },
      business: { id: i.job.business.id, business_name: i.job.business.business_name },
      salary_min: i.job.salary_min,
      salary_max: i.job.salary_max,
      start_time: i.job.start_time.toISOString(),
      end_time: i.job.end_time.toISOString(),
      updatedAt: i.job.updatedAt.toISOString(),
    })),
  });
});

// ── GET /users/me/interests  (Regular) ───────────────────────────────────────

router.get('/me/interests', requireRole('regular'), async (req, res) => {
  const userId = req.auth.id;
  const pageNum = Math.max(1, parseInt(req.query.page) || 1);
  const limitNum = Math.max(1, parseInt(req.query.limit) || 10);

  const where = { userId, candidateInterested: true };

  const [total, interests] = await Promise.all([
    prisma.interest.count({ where }),
    prisma.interest.findMany({
      where,
      include: { job: { include: { positionType: true, business: true } } },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
  ]);

  return res.json({
    count: total,
    results: interests.map((i) => ({
      interest_id: i.id,
      mutual: i.candidateInterested === true && i.businessInterested === true,
      job: {
        id: i.job.id,
        status: getEffectiveStatus(i.job),
        position_type: { id: i.job.positionType.id, name: i.job.positionType.name },
        business: { id: i.job.business.id, business_name: i.job.business.business_name },
        salary_min: i.job.salary_min,
        salary_max: i.job.salary_max,
        start_time: i.job.start_time.toISOString(),
        end_time: i.job.end_time.toISOString(),
        updatedAt: i.job.updatedAt.toISOString(),
      },
    })),
  });
});

router.all('/me', (_req, res) => res.status(405).json({ error: 'Method Not Allowed' }));
router.all('/me/interests', (_req, res) => res.status(405).json({ error: 'Method Not Allowed' }));

module.exports = router;
