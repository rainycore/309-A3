'use strict';

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { requireRole } = require('../middleware/auth');
const {
  getEffectiveStatus,
  buildStatusFilter,
  isEffectivelyAvailable,
  haversineDistance,
  calculateETA,
  timeOverlaps,
  expireNegotiations,
} = require('../utils/helpers');
const { settings } = require('../config/settings');

const prisma = new PrismaClient();

// ── GET /jobs  (Regular) ──────────────────────────────────────────────────────

router.get('/jobs', requireRole('regular'), async (req, res) => {
  await expireNegotiations(prisma);

  const userId = req.auth.id;
  const {
    lat, lon,
    position_type_id, business_id,
    updatedAt: updatedAtSort, salary: salarySort,
    start_time: startTimeSort,
    distance: distanceSort, eta: etaSort,
    page = '1', limit = '10',
  } = req.query;

  // Validate distance/eta sort requires lat/lon
  if ((distanceSort || etaSort) && (lat === undefined || lon === undefined)) {
    return res.status(400).json({ error: 'lat and lon are required when sorting by distance or eta' });
  }

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, parseInt(limit) || 10);

  const user = await prisma.regularUser.findUnique({
    where: { id: userId },
    include: { qualifications: { where: { status: 'approved' } } },
  });

  // Get all approved position type IDs for this user
  const approvedPtIds = user.qualifications.map((q) => q.positionTypeId);

  const now = new Date();
  const expiryThreshold = new Date(now.getTime() + settings.negotiation_window * 1000);

  const where = {
    status: 'open',
    start_time: { gt: expiryThreshold },
    positionTypeId: { in: approvedPtIds.length > 0 ? approvedPtIds : [-1] },
  };

  if (position_type_id) {
    const ptId = parseInt(position_type_id);
    if (!approvedPtIds.includes(ptId)) {
      return res.json({ count: 0, results: [] });
    }
    where.positionTypeId = ptId;
  }
  if (business_id) where.businessId = parseInt(business_id);

  const jobs = await prisma.job.findMany({
    where,
    include: {
      positionType: true,
      business: true,
    },
  });

  const userLat = lat !== undefined ? parseFloat(lat) : null;
  const userLon = lon !== undefined ? parseFloat(lon) : null;

  const results = jobs.map((job) => {
    const dist = (userLat !== null && userLon !== null)
      ? haversineDistance(userLat, userLon, job.business.location_lat, job.business.location_lon)
      : null;
    const eta = dist !== null ? calculateETA(dist) : null;
    return {
      id: job.id,
      status: 'open',
      position_type: { id: job.positionType.id, name: job.positionType.name },
      business: { id: job.business.id, business_name: job.business.business_name },
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      start_time: job.start_time.toISOString(),
      end_time: job.end_time.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      distance: dist !== null ? Math.round(dist * 10) / 10 : undefined,
      eta: eta !== null ? Math.round(eta) : undefined,
      _salary_avg: (job.salary_min + job.salary_max) / 2,
    };
  });

  // Sort
  results.sort((a, b) => {
    if (distanceSort) return distanceSort === 'desc' ? (b.distance - a.distance) : (a.distance - b.distance);
    if (etaSort) return etaSort === 'desc' ? (b.eta - a.eta) : (a.eta - b.eta);
    if (salarySort) return salarySort === 'desc' ? b._salary_avg - a._salary_avg : a._salary_avg - b._salary_avg;
    if (updatedAtSort) {
      const da = new Date(a.updatedAt), db = new Date(b.updatedAt);
      return updatedAtSort === 'asc' ? da - db : db - da;
    }
    if (startTimeSort) {
      const da = new Date(a.start_time), db = new Date(b.start_time);
      return startTimeSort === 'desc' ? db - da : da - db;
    }
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  const total = results.length;
  const paginated = results.slice((pageNum - 1) * limitNum, pageNum * limitNum).map(({ _salary_avg, ...r }) => r);

  return res.json({ count: total, results: paginated });
});

router.all('/jobs', (_req, res) => res.status(405).json({ error: 'Method Not Allowed' }));

// ── POST /businesses/me/jobs  (Business) ─────────────────────────────────────

router.post('/businesses/me/jobs', requireRole('business'), async (req, res) => {
  const bizId = req.auth.id;
  const biz = await prisma.business.findUnique({ where: { id: bizId } });

  if (!biz || !biz.verified) {
    return res.status(403).json({ error: 'Business must be verified to create job postings' });
  }

  const { position_type_id, salary_min, salary_max, start_time, end_time, note } = req.body;

  if (!position_type_id || salary_min === undefined || salary_max === undefined || !start_time || !end_time) {
    return res.status(400).json({ error: 'position_type_id, salary_min, salary_max, start_time, end_time are required' });
  }
  if (typeof position_type_id !== 'number' || typeof salary_min !== 'number' || typeof salary_max !== 'number') {
    return res.status(400).json({ error: 'Invalid field types' });
  }
  if (salary_min < 0) return res.status(400).json({ error: 'salary_min must be >= 0' });
  if (salary_max < salary_min) return res.status(400).json({ error: 'salary_max must be >= salary_min' });

  const pt = await prisma.positionType.findUnique({ where: { id: position_type_id } });
  if (!pt) return res.status(400).json({ error: 'Position type not found' });

  const now = new Date();
  const start = new Date(start_time);
  const end = new Date(end_time);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ error: 'Invalid date format' });
  }
  if (start <= now) return res.status(400).json({ error: 'start_time must be in the future' });
  if (end <= start) return res.status(400).json({ error: 'end_time must be after start_time' });

  // Check job start window
  const maxStart = new Date(now.getTime() + settings.job_start_window * 3600 * 1000);
  if (start > maxStart) return res.status(400).json({ error: 'start_time is too far in the future' });

  // Check enough time for negotiation window
  if (start - now < settings.negotiation_window * 1000) {
    return res.status(400).json({ error: 'Not enough time before job start for a negotiation window' });
  }

  const job = await prisma.job.create({
    data: {
      businessId: bizId,
      positionTypeId: position_type_id,
      salary_min,
      salary_max,
      start_time: start,
      end_time: end,
      note: note || '',
    },
    include: { positionType: true, business: true },
  });

  return res.status(201).json({
    id: job.id,
    status: 'open',
    position_type: { id: job.positionType.id, name: job.positionType.name },
    business: { id: job.business.id, business_name: job.business.business_name },
    worker: null,
    note: job.note,
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    start_time: job.start_time.toISOString(),
    end_time: job.end_time.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  });
});

// ── GET /businesses/me/jobs  (Business) ──────────────────────────────────────

router.get('/businesses/me/jobs', requireRole('business'), async (req, res) => {
  const bizId = req.auth.id;
  const {
    position_type_id, salary_min: smFilter, salary_max: sxFilter,
    start_time: stFilter, end_time: etFilter,
    status: statusFilter,
    page = '1', limit = '10',
  } = req.query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, parseInt(limit) || 10);

  // Parse status filter
  let statuses = ['open', 'filled'];
  if (statusFilter) {
    statuses = Array.isArray(statusFilter) ? statusFilter : [statusFilter];
  }

  const statusCondition = buildStatusFilter(statuses);

  const andConditions = [{ businessId: bizId }, statusCondition];

  if (position_type_id) andConditions.push({ positionTypeId: parseInt(position_type_id) });
  if (smFilter) andConditions.push({ salary_min: { gte: parseFloat(smFilter) } });
  if (sxFilter) andConditions.push({ salary_max: { gte: parseFloat(sxFilter) } });
  if (stFilter) andConditions.push({ start_time: { gte: new Date(stFilter) } });
  if (etFilter) andConditions.push({ end_time: { lte: new Date(etFilter) } });

  const where = { AND: andConditions };

  const [total, jobs] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      include: {
        positionType: true,
        business: true,
        worker: true,
      },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  return res.json({
    count: total,
    results: jobs.map((job) => ({
      id: job.id,
      status: getEffectiveStatus(job),
      position_type: { id: job.positionType.id, name: job.positionType.name },
      business_id: job.businessId,
      worker: job.worker ? { id: job.worker.id, first_name: job.worker.first_name, last_name: job.worker.last_name } : null,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      start_time: job.start_time.toISOString(),
      end_time: job.end_time.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    })),
  });
});

// ── PATCH /businesses/me/jobs/:jobId  (Business) ─────────────────────────────

router.patch('/businesses/me/jobs/:jobId', requireRole('business'), async (req, res) => {
  const bizId = req.auth.id;
  const jobId = parseInt(req.params.jobId);
  if (isNaN(jobId)) return res.status(404).json({ error: 'Job not found' });

  if (Object.keys(req.body).length === 0) return res.status(400).json({ error: 'No fields provided' });

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { negotiations: { where: { status: 'active' } } },
  });
  if (!job || job.businessId !== bizId) return res.status(404).json({ error: 'Job not found' });

  const effective = getEffectiveStatus(job);
  if (effective !== 'open') return res.status(403).json({ error: 'Can only edit open jobs' });

  const allowed = ['salary_min', 'salary_max', 'start_time', 'end_time', 'note'];
  const extra = Object.keys(req.body).filter((k) => !allowed.includes(k));
  if (extra.length > 0) return res.status(400).json({ error: `Unexpected fields: ${extra.join(', ')}` });

  const { salary_min, salary_max, start_time, end_time, note } = req.body;
  const data = {};

  const newSalaryMin = salary_min !== undefined ? salary_min : job.salary_min;

  if (salary_min !== undefined) {
    if (typeof salary_min !== 'number' || salary_min < 0) return res.status(400).json({ error: 'Invalid salary_min' });
    data.salary_min = salary_min;
  }
  if (salary_max !== undefined) {
    if (typeof salary_max !== 'number' || salary_max < newSalaryMin) return res.status(400).json({ error: 'salary_max must be >= salary_min' });
    data.salary_max = salary_max;
  }

  const now = new Date();
  const newStart = start_time ? new Date(start_time) : job.start_time;
  const newEnd = end_time ? new Date(end_time) : job.end_time;

  if (start_time !== undefined) {
    if (isNaN(newStart.getTime())) return res.status(400).json({ error: 'Invalid start_time' });
    if (newStart <= now) return res.status(400).json({ error: 'start_time must be in the future' });
    const maxStart = new Date(now.getTime() + settings.job_start_window * 3600 * 1000);
    if (newStart > maxStart) return res.status(400).json({ error: 'start_time is too far in the future' });
    if (newStart - now < settings.negotiation_window * 1000) return res.status(400).json({ error: 'Not enough time for negotiation window' });
    data.start_time = newStart;
  }
  if (end_time !== undefined) {
    if (isNaN(newEnd.getTime())) return res.status(400).json({ error: 'Invalid end_time' });
    if (newEnd <= newStart) return res.status(400).json({ error: 'end_time must be after start_time' });
    data.end_time = newEnd;
  }
  if (note !== undefined) data.note = note;

  // If there's an active negotiation, reset its accepted state
  if (job.negotiations.length > 0) {
    await prisma.negotiation.updateMany({
      where: { jobId: jobId, status: 'active' },
      data: { candidateAccepted: false, businessAccepted: false, updatedAt: now },
    });
  }

  const updated = await prisma.job.update({
    where: { id: jobId },
    data: { ...data, updatedAt: now },
  });

  return res.json({ id: updated.id, ...data, updatedAt: updated.updatedAt.toISOString() });
});

// ── DELETE /businesses/me/jobs/:jobId  (Business) ─────────────────────────────

router.delete('/businesses/me/jobs/:jobId', requireRole('business'), async (req, res) => {
  const bizId = req.auth.id;
  const jobId = parseInt(req.params.jobId);
  if (isNaN(jobId)) return res.status(404).json({ error: 'Job not found' });

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { negotiations: { where: { status: 'active' } } },
  });
  if (!job || job.businessId !== bizId) return res.status(404).json({ error: 'Job not found' });

  const effective = getEffectiveStatus(job);
  if (!['open', 'expired'].includes(effective)) {
    return res.status(409).json({ error: 'Can only delete open or expired jobs' });
  }
  if (job.negotiations.length > 0) {
    return res.status(409).json({ error: 'Cannot delete a job with an active negotiation' });
  }

  await prisma.job.delete({ where: { id: jobId } });
  return res.status(204).send();
});

// ── GET /jobs/:jobId  (Regular, Business) ─────────────────────────────────────

router.get('/jobs/:jobId', async (req, res) => {
  const jobId = parseInt(req.params.jobId);
  if (isNaN(jobId)) return res.status(404).json({ error: 'Job not found' });

  if (!req.auth) return res.status(401).json({ error: 'Authentication required' });

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { positionType: true, business: true, worker: true },
  });
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const { role, id: callerId } = req.auth;
  const effective = getEffectiveStatus(job);

  if (role === 'business') {
    if (job.businessId !== callerId) return res.status(403).json({ error: 'Forbidden' });
    return res.json({
      id: job.id,
      status: effective,
      position_type: { id: job.positionType.id, name: job.positionType.name },
      business: { id: job.business.id, business_name: job.business.business_name },
      worker: job.worker ? { id: job.worker.id, first_name: job.worker.first_name, last_name: job.worker.last_name } : null,
      note: job.note,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      start_time: job.start_time.toISOString(),
      end_time: job.end_time.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    });
  }

  if (role === 'regular') {
    // Regular users can see open jobs OR jobs they filled/canceled/completed
    const canSee = effective === 'open' ||
      (job.workerId === callerId && ['filled', 'completed', 'canceled'].includes(effective));
    if (!canSee) return res.status(403).json({ error: 'Forbidden' });

    return res.json({
      id: job.id,
      status: effective,
      position_type: { id: job.positionType.id, name: job.positionType.name },
      business: { id: job.business.id, business_name: job.business.business_name },
      worker: job.worker ? { id: job.worker.id, first_name: job.worker.first_name, last_name: job.worker.last_name } : null,
      note: job.note,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      start_time: job.start_time.toISOString(),
      end_time: job.end_time.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    });
  }

  return res.status(403).json({ error: 'Forbidden' });
});

router.all('/jobs/:jobId', (_req, res) => res.status(405).json({ error: 'Method Not Allowed' }));

// ── PATCH /jobs/:jobId/no-show  (Business) ────────────────────────────────────

router.patch('/jobs/:jobId/no-show', requireRole('business'), async (req, res) => {
  const bizId = req.auth.id;
  const jobId = parseInt(req.params.jobId);
  if (isNaN(jobId)) return res.status(404).json({ error: 'Job not found' });

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.businessId !== bizId) return res.status(404).json({ error: 'Job not found' });

  const effective = getEffectiveStatus(job);
  if (effective !== 'filled') {
    return res.status(409).json({ error: 'Job must be filled to report a no-show' });
  }

  const now = new Date();
  const start = new Date(job.start_time);
  const end = new Date(job.end_time);

  if (now < start) return res.status(409).json({ error: 'Job has not started yet' });
  if (now >= end) return res.status(409).json({ error: 'Job has already ended' });

  await prisma.job.update({ where: { id: jobId }, data: { status: 'canceled', updatedAt: now } });
  await prisma.regularUser.update({ where: { id: job.workerId }, data: { suspended: true } });

  return res.json({ id: jobId, status: 'canceled', updatedAt: now.toISOString() });
});

// ── PATCH /jobs/:jobId/interested  (Regular) ──────────────────────────────────

router.patch('/jobs/:jobId/interested', requireRole('regular'), async (req, res) => {
  const userId = req.auth.id;
  const jobId = parseInt(req.params.jobId);
  if (isNaN(jobId)) return res.status(404).json({ error: 'Job not found' });

  const { interested } = req.body;
  if (interested === undefined || typeof interested !== 'boolean') {
    return res.status(400).json({ error: 'interested must be a boolean' });
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const effective = getEffectiveStatus(job);
  if (effective !== 'open') return res.status(409).json({ error: 'Job is no longer available' });

  // Check user is qualified
  const qual = await prisma.qualification.findFirst({
    where: { userId, positionTypeId: job.positionTypeId, status: 'approved' },
  });
  if (!qual) return res.status(403).json({ error: 'Not qualified for this position type' });

  const existing = await prisma.interest.findUnique({
    where: { jobId_userId: { jobId, userId } },
  });

  if (!interested) {
    if (!existing || existing.candidateInterested !== true) {
      return res.status(400).json({ error: 'You have not expressed interest in this job' });
    }
    const updated = await prisma.interest.update({
      where: { id: existing.id },
      data: { candidateInterested: null, updatedAt: new Date() },
    });
    return res.json({
      id: updated.id,
      job_id: jobId,
      candidate: { id: userId, interested: null },
      business: { id: job.businessId, interested: updated.businessInterested ?? null },
    });
  }

  // Express interest
  let interest;
  if (existing) {
    interest = await prisma.interest.update({
      where: { id: existing.id },
      data: { candidateInterested: true, updatedAt: new Date() },
    });
  } else {
    interest = await prisma.interest.create({
      data: { jobId, userId, candidateInterested: true },
    });
  }

  // Reset inactivity timer and set user available
  await prisma.regularUser.update({
    where: { id: userId },
    data: { lastActiveAt: new Date(), available: true },
  });

  return res.json({
    id: interest.id,
    job_id: jobId,
    candidate: { id: userId, interested: true },
    business: { id: job.businessId, interested: interest.businessInterested ?? null },
  });
});

// ── GET /jobs/:jobId/candidates  (Business) ───────────────────────────────────

router.get('/jobs/:jobId/candidates', requireRole('business'), async (req, res) => {
  await expireNegotiations(prisma);

  const bizId = req.auth.id;
  const jobId = parseInt(req.params.jobId);
  if (isNaN(jobId)) return res.status(404).json({ error: 'Job not found' });

  const pageNum = Math.max(1, parseInt(req.query.page) || 1);
  const limitNum = Math.max(1, parseInt(req.query.limit) || 10);

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.businessId !== bizId) return res.status(404).json({ error: 'Job not found' });

  // Get all regular users with approved qualification for this position type
  const qualifiedUsers = await prisma.regularUser.findMany({
    where: {
      qualifications: { some: { positionTypeId: job.positionTypeId, status: 'approved' } },
    },
    include: {
      account: true,
      qualifications: { where: { status: 'approved' } },
      filledJobs: { where: { status: 'filled' } },
      interests: { where: { jobId } },
    },
  });

  // Filter by discoverability
  const discoverable = qualifiedUsers.filter((u) => {
    if (!isEffectivelyAvailable(u)) return false;
    // Check for time conflict with filled jobs
    const conflict = u.filledJobs.some((fj) => timeOverlaps(fj.start_time, fj.end_time, job.start_time, job.end_time));
    return !conflict;
  });

  const total = discoverable.length;
  const paginated = discoverable.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  // Find all interests where business invited these users for this job
  const invitedIds = new Set(
    (await prisma.interest.findMany({
      where: { jobId, businessInterested: true },
      select: { userId: true },
    })).map((i) => i.userId)
  );

  return res.json({
    count: total,
    results: paginated.map((u) => ({
      id: u.id,
      first_name: u.first_name,
      last_name: u.last_name,
      invited: invitedIds.has(u.id),
    })),
  });
});

// ── GET /jobs/:jobId/candidates/:userId  (Business) ───────────────────────────

router.get('/jobs/:jobId/candidates/:userId', requireRole('business'), async (req, res) => {
  await expireNegotiations(prisma);

  const bizId = req.auth.id;
  const jobId = parseInt(req.params.jobId);
  const candidateId = parseInt(req.params.userId);
  if (isNaN(jobId) || isNaN(candidateId)) return res.status(404).json({ error: 'Not found' });

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { positionType: true },
  });
  if (!job || job.businessId !== bizId) return res.status(404).json({ error: 'Job not found' });

  const user = await prisma.regularUser.findUnique({
    where: { id: candidateId },
    include: {
      account: true,
      qualifications: { where: { positionTypeId: job.positionTypeId } },
      filledJobs: { where: { status: 'filled' } },
    },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const effective = getEffectiveStatus(job);
  const isFilledByThisUser = job.status === 'filled' && job.workerId === candidateId;

  // Check if user is still discoverable, unless they filled this job
  if (!isFilledByThisUser) {
    const available = isEffectivelyAvailable(user);
    if (!available) return res.status(403).json({ error: 'User is no longer discoverable' });
    const conflict = user.filledJobs.some((fj) => timeOverlaps(fj.start_time, fj.end_time, job.start_time, job.end_time));
    if (conflict) return res.status(403).json({ error: 'User is no longer discoverable' });
  }

  const qual = user.qualifications[0] || null;

  const userObj = {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    avatar: user.avatar,
    resume: user.resume,
    biography: user.biography,
    qualification: qual ? {
      id: qual.id,
      position_type_id: qual.positionTypeId,
      document: qual.document,
      note: qual.note,
      updatedAt: qual.updatedAt.toISOString(),
    } : null,
  };

  // Only show email/phone if the candidate filled this job
  if (isFilledByThisUser) {
    userObj.email = user.account.email;
    userObj.phone_number = user.phone_number;
  }

  return res.json({
    user: userObj,
    job: {
      id: job.id,
      status: effective,
      position_type: { id: job.positionType.id, name: job.positionType.name, description: job.positionType.description },
      start_time: job.start_time.toISOString(),
      end_time: job.end_time.toISOString(),
    },
  });
});

// ── PATCH /jobs/:jobId/candidates/:userId/interested  (Business) ──────────────

router.patch('/jobs/:jobId/candidates/:userId/interested', requireRole('business'), async (req, res) => {
  await expireNegotiations(prisma);

  const bizId = req.auth.id;
  const jobId = parseInt(req.params.jobId);
  const candidateId = parseInt(req.params.userId);
  if (isNaN(jobId) || isNaN(candidateId)) return res.status(404).json({ error: 'Not found' });

  const { interested } = req.body;
  if (interested === undefined || typeof interested !== 'boolean') {
    return res.status(400).json({ error: 'interested must be a boolean' });
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.businessId !== bizId) return res.status(404).json({ error: 'Job not found' });

  const effective = getEffectiveStatus(job);
  if (effective !== 'open') return res.status(409).json({ error: 'Job is not open' });

  const user = await prisma.regularUser.findUnique({
    where: { id: candidateId },
    include: {
      account: true,
      qualifications: { where: { positionTypeId: job.positionTypeId, status: 'approved' } },
      filledJobs: { where: { status: 'filled' } },
    },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Check discoverability
  const available = isEffectivelyAvailable(user);
  if (!available) return res.status(403).json({ error: 'User is not discoverable' });
  const conflict = user.filledJobs.some((fj) => timeOverlaps(fj.start_time, fj.end_time, job.start_time, job.end_time));
  if (conflict) return res.status(403).json({ error: 'User has a conflicting job' });

  const existing = await prisma.interest.findUnique({ where: { jobId_userId: { jobId, userId: candidateId } } });

  if (!interested) {
    if (!existing || existing.businessInterested !== true) {
      return res.status(400).json({ error: 'No invitation to withdraw' });
    }
    const updated = await prisma.interest.update({
      where: { id: existing.id },
      data: { businessInterested: null, updatedAt: new Date() },
    });
    return res.json({
      id: updated.id,
      job_id: jobId,
      candidate: { id: candidateId, interested: updated.candidateInterested ?? null },
      business: { id: bizId, interested: null },
    });
  }

  let interest;
  if (existing) {
    interest = await prisma.interest.update({
      where: { id: existing.id },
      data: { businessInterested: true, updatedAt: new Date() },
    });
  } else {
    interest = await prisma.interest.create({
      data: { jobId, userId: candidateId, businessInterested: true },
    });
  }

  return res.json({
    id: interest.id,
    job_id: jobId,
    candidate: { id: candidateId, interested: interest.candidateInterested ?? null },
    business: { id: bizId, interested: true },
  });
});

// ── GET /jobs/:jobId/interests  (Business) ────────────────────────────────────

router.get('/jobs/:jobId/interests', requireRole('business'), async (req, res) => {
  const bizId = req.auth.id;
  const jobId = parseInt(req.params.jobId);
  if (isNaN(jobId)) return res.status(404).json({ error: 'Job not found' });

  const pageNum = Math.max(1, parseInt(req.query.page) || 1);
  const limitNum = Math.max(1, parseInt(req.query.limit) || 10);

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.businessId !== bizId) return res.status(404).json({ error: 'Job not found' });

  const where = {
    jobId,
    OR: [{ candidateInterested: true }, { businessInterested: true }],
  };

  const [total, interests] = await Promise.all([
    prisma.interest.count({ where }),
    prisma.interest.findMany({
      where,
      include: { user: true },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
  ]);

  return res.json({
    count: total,
    results: interests.map((i) => ({
      id: i.id,
      job_id: jobId,
      candidate: { id: i.userId, first_name: i.user.first_name, last_name: i.user.last_name, interested: i.candidateInterested ?? null },
      business: { id: bizId, interested: i.businessInterested ?? null },
    })),
  });
});

// ── GET /interests  (Regular) ─────────────────────────────────────────────────

router.get('/interests', requireRole('regular'), async (req, res) => {
  const userId = req.auth.id;
  const pageNum = Math.max(1, parseInt(req.query.page) || 1);
  const limitNum = Math.max(1, parseInt(req.query.limit) || 10);

  const where = {
    userId,
    OR: [{ candidateInterested: true }, { businessInterested: true }],
  };

  const [total, interests] = await Promise.all([
    prisma.interest.count({ where }),
    prisma.interest.findMany({
      where,
      include: { job: { include: { positionType: true, business: true } } },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  return res.json({
    count: total,
    results: interests.map((i) => ({
      id: i.id,
      job_id: i.jobId,
      candidateInterested: i.candidateInterested ?? null,
      businessInterested: i.businessInterested ?? null,
      job: {
        id: i.job.id,
        status: i.job.status,
        salary_min: i.job.salary_min,
        salary_max: i.job.salary_max,
        start_time: i.job.start_time.toISOString(),
        end_time: i.job.end_time.toISOString(),
        note: i.job.note,
        position_type: { id: i.job.positionType.id, name: i.job.positionType.name },
        business: { id: i.job.business.id, business_name: i.job.business.business_name },
      },
    })),
  });
});

router.all('/interests', (_req, res) => res.status(405).json({ error: 'Method Not Allowed' }));

module.exports = router;
