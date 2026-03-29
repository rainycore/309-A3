// Generated with Claude Code
import client from './client';

export const listPositionTypes = (params) =>
  client.get('/position-types', { params });
export const createPositionType = (data) =>
  client.post('/position-types', data);
export const updatePositionType = (id, data) =>
  client.patch(`/position-types/${id}`, data);
export const deletePositionType = (id) =>
  client.delete(`/position-types/${id}`);
