// Generated with Claude Code
import client from './client';

export const listJobs = (params) => client.get('/jobs', { params });
export const getJob = (jobId) => client.get(`/jobs/${jobId}`);
export const reportNoShow = (jobId) =>
  client.patch(`/jobs/${jobId}/no-show`);
export const expressInterest = (jobId, interested) =>
  client.patch(`/jobs/${jobId}/interested`, { interested });

// Candidates
export const listCandidates = (jobId, params) =>
  client.get(`/jobs/${jobId}/candidates`, { params });
export const getCandidate = (jobId, userId) =>
  client.get(`/jobs/${jobId}/candidates/${userId}`);
export const inviteCandidate = (jobId, userId, interested) =>
  client.patch(`/jobs/${jobId}/candidates/${userId}/interested`, { interested });

// Interests
export const listMyInterests = (params) =>
  client.get('/interests', { params });
export const listJobInterests = (jobId, params) =>
  client.get(`/jobs/${jobId}/interests`, { params });
