// Generated with Claude Code
import client from './client';

export const registerUser = (data) => client.post('/users', data);
export const getMe = () => client.get('/users/me');
export const updateMe = (data) => client.patch('/users/me', data);
export const setAvailability = (available) =>
  client.patch('/users/me/available', { available });
export const uploadAvatar = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return client.put('/users/me/avatar', fd);
};
export const uploadResume = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return client.put('/users/me/resume', fd);
};
export const getMyInvitations = (page = 1, limit = 10) =>
  client.get('/users/me/invitations', { params: { page, limit } });
export const getMyInterests = (page = 1, limit = 10) =>
  client.get('/users/me/interests', { params: { page, limit } });

// Admin
export const listUsers = (params) => client.get('/users', { params });
export const suspendUser = (userId, suspended) =>
  client.patch(`/users/${userId}/suspended`, { suspended });
