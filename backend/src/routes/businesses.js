'use strict';

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireRole } = require('../middleware/auth');
const { isValidEmail, isValidPassword } = require('../utils/helpers');

const prisma = new PrismaClient();

function makeAvatarUpload(type, id) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join('uploads', type, String(id));
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

// ── POST /businesses ──────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { business_name, owner_name, email, password, phone_number, postal_address, location } = req.body;

  if (!business_name || !owner_name || !email || !password || !phone_number || !postal_address || !location) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (typeof location !== 'object' || typeof location.lon !== 'number' || typeof location.lat !== 'number') {
    return res.status(400).json({ error: 'location must be an object with lon and lat numbers' });
  }
  if (location.lat < -90 || location.lat > 90 || location.lon < -180 || location.lon > 180) {
    return res.status(400).json({ error: 'location lat must be in [-90, 90] and lon must be in [-180, 180]' });
  }
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email format' });
  if (!isValidPassword(password)) return res.status(400).json({ error: 'Invalid password format' });

  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

  const hashedPassword = require('bcrypt').hashSync(password, 10);
  const resetToken = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const account = await prisma.account.create({
    data: {
      email,
      password: hashedPassword,
      role: 'business',
      activated: false,
      resetToken,
      resetTokenExpiresAt: expiresAt,
      business: {
        create: {
          business_name,
          owner_name,
          phone_number,
          postal_address,
          location_lon: location.lon,
          location_lat: location.lat,
        },
      },
    },
    include: { business: true },
  });

  return res.status(201).json({
    id: account.id,
    business_name: account.business.business_name,
    owner_name: account.business.owner_name,
    email: account.email,
    activated: account.activated,
    verified: account.business.verified,
    role: 'business',
    phone_number: account.business.phone_number,
    postal_address: account.business.postal_address,
    location: { lon: account.business.location_lon, lat: account.business.location_lat },
    createdAt: account.createdAt.toISOString(),
    resetToken: account.resetToken,
    expiresAt: expiresAt.toISOString(),
  });
});

// ── GET /businesses  ──────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const isAdmin = req.auth && req.auth.role === 'admin';
  const { keyword, activated, verified, owner_name: ownerSort, business_name: bnSort, email: emailSort, page = '1', limit = '10' } = req.query;

  // Admin-only params used by non-admin -> 400
  const adminOnlyParams = ['activated', 'verified', 'owner_name'];
  if (!isAdmin) {
    for (const p of adminOnlyParams) {
      if (req.query[p] !== undefined) {
        return res.status(400).json({ error: `${p} is an admin-only parameter` });
      }
    }
  }

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, parseInt(limit) || 10);

  const where = {};
  const accountWhere = { role: 'business' };

  if (isAdmin && activated !== undefined) accountWhere.activated = activated === 'true';
  if (isAdmin && verified !== undefined) where.verified = verified === 'true';
  where.account = accountWhere;

  if (keyword) {
    const keywordConditions = [
      { business_name: { contains: keyword } },
      { account: { email: { contains: keyword } } },
      { postal_address: { contains: keyword } },
      { phone_number: { contains: keyword } },
    ];
    if (isAdmin) keywordConditions.push({ owner_name: { contains: keyword } });
    where.OR = keywordConditions;
  }

  const orderBy = [];
  if (isAdmin && ownerSort) orderBy.push({ owner_name: ownerSort === 'desc' ? 'desc' : 'asc' });
  if (bnSort) orderBy.push({ business_name: bnSort === 'desc' ? 'desc' : 'asc' });
  if (emailSort) orderBy.push({ account: { email: emailSort === 'desc' ? 'desc' : 'asc' } });
  if (!orderBy.length) orderBy.push({ id: 'asc' });

  const [total, businesses] = await Promise.all([
    prisma.business.count({ where }),
    prisma.business.findMany({ where, include: { account: true }, orderBy, skip: (pageNum - 1) * limitNum, take: limitNum }),
  ]);

  return res.json({
    count: total,
    results: businesses.map((b) => {
      const obj = {
        id: b.id,
        business_name: b.business_name,
        email: b.account.email,
        role: 'business',
        phone_number: b.phone_number,
        postal_address: b.postal_address,
      };
      if (isAdmin) {
        obj.owner_name = b.owner_name;
        obj.verified = b.verified;
        obj.activated = b.account.activated;
      }
      return obj;
    }),
  });
});

// ── GET /businesses/me  (Business) ───────────────────────────────────────────

router.get('/me', requireRole('business'), async (req, res) => {
  const biz = await prisma.business.findUnique({ where: { id: req.auth.id }, include: { account: true } });
  if (!biz) return res.status(404).json({ error: 'Business not found' });

  return res.json({
    id: biz.id,
    business_name: biz.business_name,
    owner_name: biz.owner_name,
    email: biz.account.email,
    role: 'business',
    phone_number: biz.phone_number,
    postal_address: biz.postal_address,
    location: { lon: biz.location_lon, lat: biz.location_lat },
    avatar: biz.avatar,
    biography: biz.biography,
    activated: biz.account.activated,
    verified: biz.verified,
    createdAt: biz.account.createdAt.toISOString(),
  });
});

// ── PATCH /businesses/me  (Business) ─────────────────────────────────────────

router.patch('/me', requireRole('business'), async (req, res) => {
  const allowed = ['business_name', 'owner_name', 'phone_number', 'postal_address', 'location', 'avatar', 'biography'];
  const body = req.body;

  const extra = Object.keys(body).filter((k) => !allowed.includes(k));
  if (extra.length > 0) return res.status(400).json({ error: `Unexpected fields: ${extra.join(', ')}` });
  if (Object.keys(body).length === 0) return res.status(400).json({ error: 'No fields provided' });

  const data = {};
  for (const k of ['business_name', 'owner_name', 'phone_number', 'postal_address', 'avatar', 'biography']) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  if (body.location !== undefined) {
    if (typeof body.location !== 'object' || typeof body.location.lon !== 'number' || typeof body.location.lat !== 'number') {
      return res.status(400).json({ error: 'location must have lon and lat numbers' });
    }
    data.location_lon = body.location.lon;
    data.location_lat = body.location.lat;
  }

  await prisma.business.update({ where: { id: req.auth.id }, data });

  const response = { id: req.auth.id };
  for (const k of ['business_name', 'owner_name', 'phone_number', 'postal_address', 'avatar', 'biography']) {
    if (body[k] !== undefined) response[k] = body[k];
  }
  if (body.location !== undefined) response.location = body.location;

  return res.json(response);
});

// ── PUT /businesses/me/avatar  (Business) ────────────────────────────────────

router.put('/me/avatar', requireRole('business'), (req, res) => {
  const upload = makeAvatarUpload('businesses', req.auth.id);
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (req.fileTypeError) return res.status(400).json({ error: req.fileTypeError });
    if (!req.file) return res.status(400).json({ error: 'file is required' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const avatarPath = `/uploads/businesses/${req.auth.id}/avatar${ext}`;
    await prisma.business.update({ where: { id: req.auth.id }, data: { avatar: avatarPath } });
    return res.json({ avatar: avatarPath });
  });
});

// ── GET /businesses/:businessId  ─────────────────────────────────────────────

router.get('/:businessId', async (req, res) => {
  const businessId = parseInt(req.params.businessId);
  if (isNaN(businessId)) return res.status(404).json({ error: 'Business not found' });

  const isAdmin = req.auth && req.auth.role === 'admin';

  const biz = await prisma.business.findUnique({ where: { id: businessId }, include: { account: true } });
  if (!biz) return res.status(404).json({ error: 'Business not found' });

  const obj = {
    id: biz.id,
    business_name: biz.business_name,
    email: biz.account.email,
    role: 'business',
    phone_number: biz.phone_number,
    postal_address: biz.postal_address,
    location: { lon: biz.location_lon, lat: biz.location_lat },
    avatar: biz.avatar,
    biography: biz.biography,
  };
  if (isAdmin) {
    obj.owner_name = biz.owner_name;
    obj.activated = biz.account.activated;
    obj.verified = biz.verified;
    obj.createdAt = biz.account.createdAt.toISOString();
  }
  return res.json(obj);
});

// ── PATCH /businesses/:businessId/verified  (Admin) ──────────────────────────

router.patch('/:businessId/verified', requireRole('admin'), async (req, res) => {
  const businessId = parseInt(req.params.businessId);
  if (isNaN(businessId)) return res.status(404).json({ error: 'Business not found' });

  const { verified } = req.body;
  if (verified === undefined || typeof verified !== 'boolean') {
    return res.status(400).json({ error: 'verified must be a boolean' });
  }

  const biz = await prisma.business.findUnique({ where: { id: businessId }, include: { account: true } });
  if (!biz) return res.status(404).json({ error: 'Business not found' });

  await prisma.business.update({ where: { id: businessId }, data: { verified } });

  return res.json({
    id: biz.id,
    business_name: biz.business_name,
    owner_name: biz.owner_name,
    email: biz.account.email,
    activated: biz.account.activated,
    verified,
    role: 'business',
    phone_number: biz.phone_number,
    postal_address: biz.postal_address,
  });
});

router.all('/', (_req, res) => res.status(405).json({ error: 'Method Not Allowed' }));

module.exports = router;
