'use strict';

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { requireRole } = require('../middleware/auth');
const { getEffectiveStatus, expireNegotiations } = require('../utils/helpers');
const { settings } = require('../config/settings');

const prisma = new PrismaClient();

// ── POST /jobs/:jobId/negotiations  (Regular or Business) ─────────────────────
// Initiates a negotiation when mutual interest exists and neither party is busy

router.post('/jobs/:jobId/negotiations', async (req, res) => {
  if (!req.auth) return res.status(401).json({ error: 'Authentication required' });
  const { role, id: callerId } = req.auth;
  if (role !== 'regular' && role !== 'business') return res.status(403).json({ error: 'Forbidden' });

  await expireNegotiations(prisma);

  const jobId = parseInt(req.params.jobId);
  if (isNaN(jobId)) return res.status(404).json({ error: 'Job not found' });

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { positionType: true, business: true },
  });
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const effective = getEffectiveStatus(job);
  if (effective !== 'open') return res.status(409).json({ error: 'Job is not open' });

  // Determine the regular user and verify caller is a party to this job
  let regularUserId, businessId;
  if (role === 'regular') {
    regularUserId = callerId;
    businessId = job.businessId;
    // Check the job belongs to a business the user has interest in
  } else {
    businessId = callerId;
    regularUserId = req.body && req.body.user_id ? parseInt(req.body.user_id) : null;
    if (!regularUserId) return res.status(400).json({ error: 'user_id is required' });
    if (job.businessId !== businessId) return res.status(404).json({ error: 'Job not found' });
  }

  // Verify mutual interest
  const interest = await prisma.interest.findUnique({
    where: { jobId_userId: { jobId, userId: regularUserId } },
  });
  if (!interest || interest.candidateInterested !== true || interest.businessInterested !== true) {
    return res.status(409).json({ error: 'Mutual interest required to initiate negotiation' });
  }

  // Check neither party is in an active negotiation
  const now = new Date();

  const userActiveNeg = await prisma.negotiation.findFirst({
    where: { userId: regularUserId, status: 'active', expiresAt: { gt: now } },
  });
  if (userActiveNeg) {
    const waitMs = new Date(userActiveNeg.expiresAt).getTime() - now.getTime();
    return res.status(409).json({
      error: 'Regular user is already in an active negotiation',
      wait_seconds: Math.ceil(waitMs / 1000),
    });
  }

  const jobActiveNeg = await prisma.negotiation.findFirst({
    where: { jobId, status: 'active', expiresAt: { gt: now } },
  });
  if (jobActiveNeg) {
    const waitMs = new Date(jobActiveNeg.expiresAt).getTime() - now.getTime();
    return res.status(409).json({
      error: 'Job is already in an active negotiation',
      wait_seconds: Math.ceil(waitMs / 1000),
    });
  }

  const expiresAt = new Date(now.getTime() + settings.negotiation_window * 1000);

  const negotiation = await prisma.negotiation.create({
    data: {
      jobId,
      userId: regularUserId,
      status: 'active',
      expiresAt,
    },
    include: {
      job: { include: { positionType: true, business: true } },
      user: true,
    },
  });

  return res.status(201).json({
    id: negotiation.id,
    status: negotiation.status,
    job_id: jobId,
    user_id: regularUserId,
    business_id: businessId,
    candidate_accepted: negotiation.candidateAccepted,
    business_accepted: negotiation.businessAccepted,
    expires_at: negotiation.expiresAt.toISOString(),
    createdAt: negotiation.createdAt.toISOString(),
  });
});

// ── POST /negotiations  (Regular or Business) ─────────────────────────────────
// Initiates a negotiation; job_id comes from the request body

router.post('/negotiations', async (req, res) => {
  if (!req.auth) return res.status(401).json({ error: 'Authentication required' });
  const { role, id: callerId } = req.auth;
  if (role !== 'regular' && role !== 'business') return res.status(403).json({ error: 'Forbidden' });

  await expireNegotiations(prisma);

  const jobId = parseInt(req.body && req.body.job_id);
  if (isNaN(jobId)) return res.status(400).json({ error: 'job_id is required' });

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { positionType: true, business: true },
  });
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const effective = getEffectiveStatus(job);
  if (effective !== 'open') return res.status(409).json({ error: 'Job is not open' });

  let regularUserId, businessId;
  if (role === 'regular') {
    regularUserId = callerId;
    businessId = job.businessId;
  } else {
    businessId = callerId;
    regularUserId = req.body && req.body.user_id ? parseInt(req.body.user_id) : null;
    if (!regularUserId) return res.status(400).json({ error: 'user_id is required' });
    if (job.businessId !== businessId) return res.status(404).json({ error: 'Job not found' });
  }

  const interest = await prisma.interest.findUnique({
    where: { jobId_userId: { jobId, userId: regularUserId } },
  });
  if (!interest || interest.candidateInterested !== true || interest.businessInterested !== true) {
    return res.status(409).json({ error: 'Mutual interest required to initiate negotiation' });
  }

  const now = new Date();
  const userActiveNeg = await prisma.negotiation.findFirst({
    where: { userId: regularUserId, status: 'active', expiresAt: { gt: now } },
  });
  if (userActiveNeg) {
    const waitMs = new Date(userActiveNeg.expiresAt).getTime() - now.getTime();
    return res.status(409).json({ error: 'Regular user is already in an active negotiation', wait_seconds: Math.ceil(waitMs / 1000) });
  }

  const jobActiveNeg = await prisma.negotiation.findFirst({
    where: { jobId, status: 'active', expiresAt: { gt: now } },
  });
  if (jobActiveNeg) {
    const waitMs = new Date(jobActiveNeg.expiresAt).getTime() - now.getTime();
    return res.status(409).json({ error: 'Job is already in an active negotiation', wait_seconds: Math.ceil(waitMs / 1000) });
  }

  const expiresAt = new Date(now.getTime() + settings.negotiation_window * 1000);
  const negotiation = await prisma.negotiation.create({
    data: { jobId, userId: regularUserId, status: 'active', expiresAt },
    include: { job: { include: { positionType: true, business: true } }, user: true },
  });

  return res.status(201).json({
    id: negotiation.id, status: negotiation.status, job_id: jobId,
    user_id: regularUserId, business_id: businessId,
    candidate_accepted: negotiation.candidateAccepted, business_accepted: negotiation.businessAccepted,
    expires_at: negotiation.expiresAt.toISOString(), createdAt: negotiation.createdAt.toISOString(),
  });
});

router.all('/negotiations', (_req, res) => res.status(405).json({ error: 'Method Not Allowed' }));

// ── PATCH /negotiations/me/decision  (Regular or Business) ────────────────────

router.patch('/negotiations/me/decision', async (req, res) => {
  if (!req.auth) return res.status(401).json({ error: 'Authentication required' });
  const { role, id: callerId } = req.auth;
  if (role !== 'regular' && role !== 'business') return res.status(403).json({ error: 'Forbidden' });

  await expireNegotiations(prisma);

  const now = new Date();
  let neg;
  if (role === 'regular') {
    neg = await prisma.negotiation.findFirst({
      where: { userId: callerId, status: 'active', expiresAt: { gt: now } },
      include: { job: true, user: true },
    });
  } else {
    neg = await prisma.negotiation.findFirst({
      where: { status: 'active', expiresAt: { gt: now }, job: { businessId: callerId } },
      include: { job: true, user: true },
    });
  }

  if (!neg) return res.status(404).json({ error: 'No active negotiation found' });

  const { accepted } = req.body;
  if (accepted === undefined || typeof accepted !== 'boolean') {
    return res.status(400).json({ error: 'accepted must be a boolean' });
  }

  if (!accepted) {
    await prisma.negotiation.update({ where: { id: neg.id }, data: { status: 'rejected', updatedAt: now } });
    await prisma.regularUser.update({ where: { id: neg.userId }, data: { available: true, lastActiveAt: now } });
    return res.json({
      id: neg.id, status: 'rejected', job_id: neg.jobId, user_id: neg.userId,
      business_id: neg.job.businessId,
      candidate_accepted: role === 'regular' ? false : neg.candidateAccepted,
      business_accepted: role === 'business' ? false : neg.businessAccepted,
      expires_at: neg.expiresAt.toISOString(), updatedAt: now.toISOString(),
    });
  }

  const updateData = { updatedAt: now };
  if (role === 'regular') updateData.candidateAccepted = true;
  else updateData.businessAccepted = true;

  const updated = await prisma.negotiation.update({ where: { id: neg.id }, data: updateData });

  if (updated.candidateAccepted && updated.businessAccepted) {
    await prisma.negotiation.update({ where: { id: neg.id }, data: { status: 'completed', updatedAt: now } });
    await prisma.job.update({ where: { id: neg.jobId }, data: { status: 'filled', workerId: neg.userId, updatedAt: now } });
    await prisma.regularUser.update({ where: { id: neg.userId }, data: { available: false } });
    return res.json({
      id: neg.id, status: 'completed', job_id: neg.jobId, user_id: neg.userId,
      business_id: neg.job.businessId, candidate_accepted: true, business_accepted: true,
      expires_at: neg.expiresAt.toISOString(), updatedAt: now.toISOString(),
    });
  }

  return res.json({
    id: updated.id, status: updated.status, job_id: updated.jobId, user_id: updated.userId,
    business_id: neg.job.businessId, candidate_accepted: updated.candidateAccepted,
    business_accepted: updated.businessAccepted,
    expires_at: updated.expiresAt.toISOString(), updatedAt: updated.updatedAt.toISOString(),
  });
});

// ── GET /negotiations/me  (Regular or Business) ────────────────────────────────

router.get('/negotiations/me', async (req, res) => {
  if (!req.auth) return res.status(401).json({ error: 'Authentication required' });
  const { role, id: callerId } = req.auth;
  if (role !== 'regular' && role !== 'business') return res.status(403).json({ error: 'Forbidden' });

  await expireNegotiations(prisma);

  const now = new Date();
  let neg;
  const jobInclude = { include: { business: true, positionType: true } };
  if (role === 'regular') {
    neg = await prisma.negotiation.findFirst({
      where: { userId: callerId, status: 'active', expiresAt: { gt: now } },
      include: { job: jobInclude, user: true },
    });
  } else {
    neg = await prisma.negotiation.findFirst({
      where: { status: 'active', expiresAt: { gt: now }, job: { businessId: callerId } },
      include: { job: jobInclude, user: true },
    });
  }

  if (!neg) return res.status(404).json({ error: 'No active negotiation found' });

  return res.json({
    id: neg.id,
    status: neg.status,
    job_id: neg.jobId,
    user_id: neg.userId,
    business_id: neg.job.businessId,
    candidateAccepted: neg.candidateAccepted,
    businessAccepted: neg.businessAccepted,
    expiresAt: neg.expiresAt.toISOString(),
    createdAt: neg.createdAt.toISOString(),
    updatedAt: neg.updatedAt.toISOString(),
    job: {
      id: neg.job.id,
      salary_min: neg.job.salary_min,
      salary_max: neg.job.salary_max,
      start_time: neg.job.start_time.toISOString(),
      end_time: neg.job.end_time.toISOString(),
      note: neg.job.note,
      positionType: neg.job.positionType ? { id: neg.job.positionType.id, name: neg.job.positionType.name } : null,
      business: { id: neg.job.business.id, business_name: neg.job.business.business_name },
    },
    user: neg.user ? { id: neg.user.id, first_name: neg.user.first_name, last_name: neg.user.last_name } : null,
  });
});

// ── GET /negotiations/:negotiationId  (Regular or Business) ───────────────────

router.get('/negotiations/:negotiationId', async (req, res) => {
  const negId = parseInt(req.params.negotiationId);
  if (isNaN(negId)) return res.status(404).json({ error: 'Negotiation not found' });

  if (!req.auth) return res.status(401).json({ error: 'Authentication required' });
  const { role, id: callerId } = req.auth;
  if (role !== 'regular' && role !== 'business') return res.status(403).json({ error: 'Forbidden' });

  await expireNegotiations(prisma);

  const neg = await prisma.negotiation.findUnique({
    where: { id: negId },
    include: { job: { include: { business: true } }, user: true },
  });
  if (!neg) return res.status(404).json({ error: 'Negotiation not found' });

  // Only parties to this negotiation can view it
  if (role === 'regular' && neg.userId !== callerId) return res.status(403).json({ error: 'Forbidden' });
  if (role === 'business' && neg.job.businessId !== callerId) return res.status(403).json({ error: 'Forbidden' });

  return res.json({
    id: neg.id,
    status: neg.status,
    job_id: neg.jobId,
    user_id: neg.userId,
    business_id: neg.job.businessId,
    candidate_accepted: neg.candidateAccepted,
    business_accepted: neg.businessAccepted,
    expires_at: neg.expiresAt.toISOString(),
    createdAt: neg.createdAt.toISOString(),
    updatedAt: neg.updatedAt.toISOString(),
  });
});

// ── PATCH /negotiations/:negotiationId  (Regular or Business) ─────────────────
// Accept or reject; if both accept the job is filled

router.patch('/negotiations/:negotiationId', async (req, res) => {
  const negId = parseInt(req.params.negotiationId);
  if (isNaN(negId)) return res.status(404).json({ error: 'Negotiation not found' });

  if (!req.auth) return res.status(401).json({ error: 'Authentication required' });
  const { role, id: callerId } = req.auth;
  if (role !== 'regular' && role !== 'business') return res.status(403).json({ error: 'Forbidden' });

  await expireNegotiations(prisma);

  const neg = await prisma.negotiation.findUnique({
    where: { id: negId },
    include: { job: true, user: true },
  });
  if (!neg) return res.status(404).json({ error: 'Negotiation not found' });

  if (role === 'regular' && neg.userId !== callerId) return res.status(403).json({ error: 'Forbidden' });
  if (role === 'business' && neg.job.businessId !== callerId) return res.status(403).json({ error: 'Forbidden' });

  if (neg.status !== 'active') {
    return res.status(409).json({ error: 'Negotiation is no longer active' });
  }

  const now = new Date();
  if (now > new Date(neg.expiresAt)) {
    // Expired — update and return appropriate error
    await prisma.negotiation.update({ where: { id: negId }, data: { status: 'expired', updatedAt: now } });
    await prisma.regularUser.update({ where: { id: neg.userId }, data: { available: true, lastActiveAt: now } });
    return res.status(409).json({ error: 'Negotiation has expired' });
  }

  const { accepted } = req.body;
  if (accepted === undefined || typeof accepted !== 'boolean') {
    return res.status(400).json({ error: 'accepted must be a boolean' });
  }

  if (!accepted) {
    // Reject — end immediately
    await prisma.negotiation.update({ where: { id: negId }, data: { status: 'rejected', updatedAt: now } });
    await prisma.regularUser.update({ where: { id: neg.userId }, data: { available: true, lastActiveAt: now } });

    return res.json({
      id: neg.id,
      status: 'rejected',
      job_id: neg.jobId,
      user_id: neg.userId,
      business_id: neg.job.businessId,
      candidate_accepted: role === 'regular' ? false : neg.candidateAccepted,
      business_accepted: role === 'business' ? false : neg.businessAccepted,
      expires_at: neg.expiresAt.toISOString(),
      updatedAt: now.toISOString(),
    });
  }

  // Accept
  const updateData = { updatedAt: now };
  if (role === 'regular') updateData.candidateAccepted = true;
  else updateData.businessAccepted = true;

  const updated = await prisma.negotiation.update({ where: { id: negId }, data: updateData });

  // Check if both accepted
  if (updated.candidateAccepted && updated.businessAccepted) {
    await prisma.negotiation.update({ where: { id: negId }, data: { status: 'completed', updatedAt: now } });
    await prisma.job.update({
      where: { id: neg.jobId },
      data: { status: 'filled', workerId: neg.userId, updatedAt: now },
    });
    // Worker is no longer available
    await prisma.regularUser.update({ where: { id: neg.userId }, data: { available: false } });

    return res.json({
      id: negId,
      status: 'completed',
      job_id: neg.jobId,
      user_id: neg.userId,
      business_id: neg.job.businessId,
      candidate_accepted: true,
      business_accepted: true,
      expires_at: neg.expiresAt.toISOString(),
      updatedAt: now.toISOString(),
    });
  }

  return res.json({
    id: updated.id,
    status: updated.status,
    job_id: updated.jobId,
    user_id: updated.userId,
    business_id: neg.job.businessId,
    candidate_accepted: updated.candidateAccepted,
    business_accepted: updated.businessAccepted,
    expires_at: updated.expiresAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

module.exports = router;
