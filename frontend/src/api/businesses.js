// Generated with Claude Code
import client from './client';

export const registerBusiness = (data) => client.post('/businesses', data);
export const getMyBusiness = () => client.get('/businesses/me');
export const updateMyBusiness = (data) => client.patch('/businesses/me', data);
export const uploadBusinessAvatar = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return client.put('/businesses/me/avatar', fd);
};
export const listBusinesses = (params) =>
  client.get('/businesses', { params });
export const getBusiness = (id) => client.get(`/businesses/${id}`);
export const verifyBusiness = (id, verified) =>
  client.patch(`/businesses/${id}/verified`, { verified });

// Business jobs
export const createJob = (data) => client.post('/businesses/me/jobs', data);
export const listMyJobs = (params) =>
  client.get('/businesses/me/jobs', { params });
export const editJob = (jobId, data) =>
  client.patch(`/businesses/me/jobs/${jobId}`, data);
export const deleteJob = (jobId) =>
  client.delete(`/businesses/me/jobs/${jobId}`);
