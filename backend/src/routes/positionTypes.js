'use strict';

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

// ── POST /position-types  (Admin) ─────────────────────────────────────────────

router.post('/', requireRole('admin'), async (req, res) => {
  const { name, description, hidden } = req.body;

  if (!name || !description) {
    return res.status(400).json({ error: 'name and description are required' });
  }
  if (typeof name !== 'string' || typeof description !== 'string') {
    return res.status(400).json({ error: 'name and description must be strings' });
  }
  if (hidden !== undefined && typeof hidden !== 'boolean') {
    return res.status(400).json({ error: 'hidden must be a boolean' });
  }

  const pt = await prisma.positionType.create({
    data: {
      name,
      description,
      hidden: hidden !== undefined ? hidden : true,
    },
  });

  const numQualified = await prisma.qualification.count({
    where: { positionTypeId: pt.id, status: 'approved' },
  });

  return res.status(201).json({
    id: pt.id,
    name: pt.name,
    description: pt.description,
    hidden: pt.hidden,
    num_qualified: numQualified,
  });
});

// ── GET /position-types  (Regular, Business, Admin) ───────────────────────────

router.get('/', async (req, res) => {
  const isAdmin = req.auth && req.auth.role === 'admin';
  const { keyword, name: nameSort, hidden: hiddenFilter, num_qualified: nqSort, page = '1', limit = '10' } = req.query;

  if (!isAdmin && (hiddenFilter !== undefined || nqSort !== undefined)) {
    return res.status(req.auth ? 403 : 401).json({ error: req.auth ? 'Forbidden' : 'Authentication required' });
  }

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, parseInt(limit) || 10);

  const where = {};
  if (!isAdmin) where.hidden = false;
  if (isAdmin && hiddenFilter !== undefined) where.hidden = hiddenFilter === 'true';
  if (keyword) {
    where.OR = [{ name: { contains: keyword } }, { description: { contains: keyword } }];
  }

  const orderBy = [];
  if (nameSort) orderBy.push({ name: nameSort === 'desc' ? 'desc' : 'asc' });
  if (!orderBy.length) orderBy.push({ id: 'asc' });

  const [total, pts] = await Promise.all([
    prisma.positionType.count({ where }),
    prisma.positionType.findMany({
      where,
      include: {
        _count: { select: { qualifications: { where: { status: 'approved' } } } },
      },
      orderBy,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
  ]);

  // Handle num_qualified sort in application code (Prisma can't sort by relation count directly)
  let results = pts.map((pt) => {
    const obj = {
      id: pt.id,
      name: pt.name,
      description: pt.description,
    };
    if (isAdmin) {
      obj.hidden = pt.hidden;
      obj.num_qualified = pt._count.qualifications;
    }
    return obj;
  });

  if (isAdmin && nqSort) {
    results.sort((a, b) => nqSort === 'desc' ? b.num_qualified - a.num_qualified : a.num_qualified - b.num_qualified);
  }

  return res.json({ count: total, results });
});

// ── PATCH /position-types/:positionTypeId  (Admin) ───────────────────────────

router.patch('/:positionTypeId', requireRole('admin'), async (req, res) => {
  const ptId = parseInt(req.params.positionTypeId);
  if (isNaN(ptId)) return res.status(404).json({ error: 'Position type not found' });

  const { name, description, hidden } = req.body;
  if (Object.keys(req.body).length === 0) return res.status(400).json({ error: 'No fields provided' });

  const pt = await prisma.positionType.findUnique({ where: { id: ptId } });
  if (!pt) return res.status(404).json({ error: 'Position type not found' });

  const data = {};
  if (name !== undefined) {
    if (typeof name !== 'string') return res.status(400).json({ error: 'name must be a string' });
    data.name = name;
  }
  if (description !== undefined) {
    if (typeof description !== 'string') return res.status(400).json({ error: 'description must be a string' });
    data.description = description;
  }
  if (hidden !== undefined) {
    if (typeof hidden !== 'boolean') return res.status(400).json({ error: 'hidden must be a boolean' });
    data.hidden = hidden;
  }

  await prisma.positionType.update({ where: { id: ptId }, data });

  return res.json({ id: ptId, ...data });
});

// ── DELETE /position-types/:positionTypeId  (Admin) ───────────────────────────

router.delete('/:positionTypeId', requireRole('admin'), async (req, res) => {
  const ptId = parseInt(req.params.positionTypeId);
  if (isNaN(ptId)) return res.status(404).json({ error: 'Position type not found' });

  const pt = await prisma.positionType.findUnique({ where: { id: ptId } });
  if (!pt) return res.status(404).json({ error: 'Position type not found' });

  const numQualified = await prisma.qualification.count({
    where: { positionTypeId: ptId, status: 'approved' },
  });
  if (numQualified > 0) {
    return res.status(409).json({ error: 'Cannot delete a position type with qualified users' });
  }

  await prisma.positionType.delete({ where: { id: ptId } });
  return res.status(204).send();
});

router.all('/', (_req, res) => res.status(405).json({ error: 'Method Not Allowed' }));
router.all('/:positionTypeId', (_req, res) => res.status(405).json({ error: 'Method Not Allowed' }));

module.exports = router;
