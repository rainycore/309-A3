'use strict';

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

function makeDocumentUpload(userId, positionTypeId) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join('uploads', 'users', String(userId), 'position_type', String(positionTypeId));
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, 'document.pdf'),
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

// ── GET /qualifications  (Admin) ──────────────────────────────────────────────

router.get('/', requireRole('admin'), async (req, res) => {
  const { keyword, page = '1', limit = '10' } = req.query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, parseInt(limit) || 10);

  const where = {
    status: { in: ['submitted', 'revised'] },
  };

  if (keyword) {
    where.user = {
      OR: [
        { first_name: { contains: keyword } },
        { last_name: { contains: keyword } },
        { account: { email: { contains: keyword } } },
        { phone_number: { contains: keyword } },
      ],
    };
  }

  const [total, quals] = await Promise.all([
    prisma.qualification.count({ where }),
    prisma.qualification.findMany({
      where,
      include: {
        user: { include: { account: true } },
        positionType: true,
      },
      orderBy: { updatedAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
  ]);

  return res.json({
    count: total,
    results: quals.map((q) => ({
      id: q.id,
      status: q.status,
      user: { id: q.user.id, first_name: q.user.first_name, last_name: q.user.last_name },
      position_type: { id: q.positionType.id, name: q.positionType.name },
      updatedAt: q.updatedAt.toISOString(),
    })),
  });
});

// ── POST /qualifications  (Regular) ──────────────────────────────────────────

router.post('/', requireRole('regular'), async (req, res) => {
  const { position_type_id, note } = req.body;

  if (!position_type_id || typeof position_type_id !== 'number') {
    return res.status(400).json({ error: 'position_type_id is required and must be a number' });
  }

  const pt = await prisma.positionType.findUnique({ where: { id: position_type_id } });
  if (!pt) return res.status(404).json({ error: 'Position type not found' });
  if (pt.hidden) return res.status(400).json({ error: 'Position type is hidden' });

  const existing = await prisma.qualification.findUnique({
    where: { userId_positionTypeId: { userId: req.auth.id, positionTypeId: position_type_id } },
  });
  if (existing) return res.status(409).json({ error: 'Qualification already exists for this position type' });

  const user = await prisma.regularUser.findUnique({ where: { id: req.auth.id } });

  const qual = await prisma.qualification.create({
    data: {
      userId: req.auth.id,
      positionTypeId: position_type_id,
      note: note || '',
    },
    include: {
      user: true,
      positionType: true,
    },
  });

  return res.status(201).json({
    id: qual.id,
    status: qual.status,
    note: qual.note,
    document: qual.document,
    user: { id: qual.user.id, first_name: qual.user.first_name, last_name: qual.user.last_name },
    position_type: { id: qual.positionType.id, name: qual.positionType.name },
    updatedAt: qual.updatedAt.toISOString(),
  });
});

// ── GET /qualifications/:qualificationId  (Admin, Regular, Business) ──────────

router.get('/:qualificationId', async (req, res) => {
  if (!req.auth) return res.status(401).json({ error: 'Authentication required' });

  const qualId = parseInt(req.params.qualificationId);
  if (isNaN(qualId)) return res.status(404).json({ error: 'Qualification not found' });

  const qual = await prisma.qualification.findUnique({
    where: { id: qualId },
    include: {
      user: { include: { account: true } },
      positionType: true,
    },
  });
  if (!qual) return res.status(404).json({ error: 'Qualification not found' });

  const { role, id: callerId } = req.auth;

  if (role === 'regular') {
    if (qual.userId !== callerId) return res.status(404).json({ error: 'Qualification not found' });

    return res.json({
      id: qual.id,
      document: qual.document,
      note: qual.note,
      position_type: { id: qual.positionType.id, name: qual.positionType.name, description: qual.positionType.description },
      updatedAt: qual.updatedAt.toISOString(),
      user: {
        id: qual.user.id,
        first_name: qual.user.first_name,
        last_name: qual.user.last_name,
        role: 'regular',
        avatar: qual.user.avatar,
        resume: qual.user.resume,
        biography: qual.user.biography,
        email: qual.user.account.email,
        phone_number: qual.user.phone_number,
        postal_address: qual.user.postal_address,
        birthday: qual.user.birthday,
        activated: qual.user.account.activated,
        suspended: qual.user.suspended,
        createdAt: qual.user.account.createdAt.toISOString(),
      },
      status: qual.status,
    });
  }

  if (role === 'admin') {
    return res.json({
      id: qual.id,
      document: qual.document,
      note: qual.note,
      position_type: { id: qual.positionType.id, name: qual.positionType.name, description: qual.positionType.description },
      updatedAt: qual.updatedAt.toISOString(),
      user: {
        id: qual.user.id,
        first_name: qual.user.first_name,
        last_name: qual.user.last_name,
        role: 'regular',
        avatar: qual.user.avatar,
        resume: qual.user.resume,
        biography: qual.user.biography,
        email: qual.user.account.email,
        phone_number: qual.user.phone_number,
        postal_address: qual.user.postal_address,
        birthday: qual.user.birthday,
        activated: qual.user.account.activated,
        suspended: qual.user.suspended,
        createdAt: qual.user.account.createdAt.toISOString(),
      },
      status: qual.status,
    });
  }

  if (role === 'business') {
    // Business can only see approved qualifications
    if (qual.status !== 'approved') return res.status(403).json({ error: 'Forbidden' });

    // User must have expressed interest in one of the business's open jobs for this position type
    const hasInterest = await prisma.interest.findFirst({
      where: {
        userId: qual.userId,
        candidateInterested: true,
        job: {
          businessId: callerId,
          positionTypeId: qual.positionTypeId,
        },
      },
    });
    if (!hasInterest) return res.status(403).json({ error: 'Forbidden' });

    return res.json({
      id: qual.id,
      document: qual.document,
      note: qual.note,
      position_type: { id: qual.positionType.id, name: qual.positionType.name, description: qual.positionType.description },
      updatedAt: qual.updatedAt.toISOString(),
      user: {
        id: qual.user.id,
        first_name: qual.user.first_name,
        last_name: qual.user.last_name,
        role: 'regular',
        avatar: qual.user.avatar,
        resume: qual.user.resume,
        biography: qual.user.biography,
      },
    });
  }

  return res.status(403).json({ error: 'Forbidden' });
});

// ── PATCH /qualifications/:qualificationId  (Admin, Regular) ──────────────────

router.patch('/:qualificationId', async (req, res) => {
  if (!req.auth) return res.status(401).json({ error: 'Authentication required' });

  const qualId = parseInt(req.params.qualificationId);
  if (isNaN(qualId)) return res.status(404).json({ error: 'Qualification not found' });

  const qual = await prisma.qualification.findUnique({
    where: { id: qualId },
    include: { user: true, positionType: true },
  });
  if (!qual) return res.status(404).json({ error: 'Qualification not found' });

  const { role, id: callerId } = req.auth;
  const { status, note } = req.body;

  if (Object.keys(req.body).length === 0) return res.status(400).json({ error: 'No fields provided' });

  if (role === 'regular') {
    if (qual.userId !== callerId) return res.status(404).json({ error: 'Qualification not found' });

    const data = {};
    if (status !== undefined) {
      const allowedTransitions = {
        created: ['submitted'],
        approved: ['revised'],
        rejected: ['revised'],
      };
      const allowed = allowedTransitions[qual.status] || [];
      if (!allowed.includes(status)) return res.status(403).json({ error: 'Invalid status transition' });
      data.status = status;
    }
    if (note !== undefined) data.note = note;

    const updated = await prisma.qualification.update({
      where: { id: qualId },
      data: { ...data, updatedAt: new Date() },
      include: { user: true, positionType: true },
    });

    return res.json({
      id: updated.id,
      status: updated.status,
      document: updated.document,
      note: updated.note,
      user: { id: updated.user.id, first_name: updated.user.first_name, last_name: updated.user.last_name },
      position_type: { id: updated.positionType.id, name: updated.positionType.name },
      updatedAt: updated.updatedAt.toISOString(),
    });
  }

  if (role === 'admin') {
    const data = {};
    if (status !== undefined) {
      const allowedSources = ['submitted', 'revised'];
      const allowedTargets = ['approved', 'rejected'];
      if (!allowedSources.includes(qual.status)) return res.status(403).json({ error: 'Invalid status transition' });
      if (!allowedTargets.includes(status)) return res.status(403).json({ error: 'Invalid status transition' });
      data.status = status;
    }
    if (note !== undefined) data.note = note;

    const updated = await prisma.qualification.update({
      where: { id: qualId },
      data: { ...data, updatedAt: new Date() },
      include: { user: true, positionType: true },
    });

    return res.json({
      id: updated.id,
      status: updated.status,
      document: updated.document,
      note: updated.note,
      user: { id: updated.user.id, first_name: updated.user.first_name, last_name: updated.user.last_name },
      position_type: { id: updated.positionType.id, name: updated.positionType.name },
      updatedAt: updated.updatedAt.toISOString(),
    });
  }

  return res.status(403).json({ error: 'Forbidden' });
});

// ── PUT /qualifications/:qualificationId/document  (Regular) ──────────────────

router.put('/:qualificationId/document', requireRole('regular'), async (req, res) => {
  const qualId = parseInt(req.params.qualificationId);
  if (isNaN(qualId)) return res.status(404).json({ error: 'Qualification not found' });

  const qual = await prisma.qualification.findUnique({ where: { id: qualId } });
  if (!qual) return res.status(404).json({ error: 'Qualification not found' });
  if (qual.userId !== req.auth.id) return res.status(403).json({ error: 'Forbidden' });

  const upload = makeDocumentUpload(req.auth.id, qual.positionTypeId);
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'file is required' });

    const docPath = `/uploads/users/${req.auth.id}/position_type/${qual.positionTypeId}/document.pdf`;
    await prisma.qualification.update({ where: { id: qualId }, data: { document: docPath, updatedAt: new Date() } });
    return res.json({ document: docPath });
  });
});

router.all('/', (_req, res) => res.status(405).json({ error: 'Method Not Allowed' }));

module.exports = router;
