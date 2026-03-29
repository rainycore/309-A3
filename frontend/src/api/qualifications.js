// Generated with Claude Code
import client from './client';

export const createQualification = (position_type_id, note) =>
  client.post('/qualifications', { position_type_id, note });
export const listPendingQualifications = (params) =>
  client.get('/qualifications', { params });
export const getQualification = (id) => client.get(`/qualifications/${id}`);
export const updateQualification = (id, data) =>
  client.patch(`/qualifications/${id}`, data);
export const uploadQualificationDocument = (id, file) => {
  const fd = new FormData();
  fd.append('file', file);
  return client.put(`/qualifications/${id}/document`, fd);
};
