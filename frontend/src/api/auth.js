import client from './client';

export const login = (email, password) =>
  client.post('/auth/tokens', { email, password });

export const requestPasswordReset = (email) =>
  client.post('/auth/resets', { email });

export const resetPassword = (resetToken, email, password) =>
  client.post(`/auth/resets/${resetToken}`, { email, password });

export const activateAccount = (resetToken, email) =>
  client.post(`/auth/resets/${resetToken}`, { email });
