'use strict';

const { settings } = require('../config/settings');

// Haversine formula – returns distance in km
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ETA in minutes assuming average 30 km/h travel speed
function calculateETA(distanceKm) {
  return (distanceKm / 30) * 60;
}

function isValidPassword(password) {
  if (typeof password !== 'string') return false;
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,20}$/.test(password);
}

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Returns the effective status of a job based on current time
function getEffectiveStatus(job) {
  const now = new Date();
  if (job.status === 'open') {
    const start = new Date(job.start_time);
    if (start - now < settings.negotiation_window * 1000) return 'expired';
    return 'open';
  }
  if (job.status === 'filled') {
    if (now >= new Date(job.end_time)) return 'completed';
    return 'filled';
  }
  return job.status; // 'canceled'
}

// Build a Prisma OR condition translating effective statuses to DB fields
function buildStatusFilter(statuses) {
  const now = new Date();
  const expiryThreshold = new Date(now.getTime() + settings.negotiation_window * 1000);
  const conditions = [];

  if (statuses.includes('open')) {
    conditions.push({ status: 'open', start_time: { gt: expiryThreshold } });
  }
  if (statuses.includes('expired')) {
    conditions.push({ status: 'open', start_time: { lte: expiryThreshold } });
  }
  if (statuses.includes('filled')) {
    conditions.push({ status: 'filled', end_time: { gt: now } });
  }
  if (statuses.includes('completed')) {
    conditions.push({ status: 'filled', end_time: { lte: now } });
  }
  if (statuses.includes('canceled')) {
    conditions.push({ status: 'canceled' });
  }

  if (conditions.length === 0) return { id: -1 }; // match nothing
  if (conditions.length === 1) return conditions[0];
  return { OR: conditions };
}

// Whether a regular user is effectively available for discovery on a given job
function isEffectivelyAvailable(user) {
  if (!user.available || user.suspended) return false;
  if (!user.account || !user.account.activated) return false;
  const inactive = (Date.now() - new Date(user.lastActiveAt).getTime()) / 1000;
  return inactive < settings.availability_timeout;
}

// Check whether two time windows overlap
function timeOverlaps(startA, endA, startB, endB) {
  return new Date(startA) < new Date(endB) && new Date(endA) > new Date(startB);
}

// Expire stale active negotiations and return regular user to available state
async function expireNegotiations(prisma) {
  const now = new Date();
  const expired = await prisma.negotiation.findMany({
    where: { status: 'active', expiresAt: { lte: now } },
  });
  for (const neg of expired) {
    await prisma.negotiation.update({
      where: { id: neg.id },
      data: { status: 'expired', updatedAt: now },
    });
    // Return regular user to available
    await prisma.regularUser.update({
      where: { id: neg.userId },
      data: { available: true, lastActiveAt: now },
    });
  }
}

module.exports = {
  haversineDistance,
  calculateETA,
  isValidPassword,
  isValidEmail,
  getEffectiveStatus,
  buildStatusFilter,
  isEffectivelyAvailable,
  timeOverlaps,
  expireNegotiations,
};
