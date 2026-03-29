// Generated with Claude Code
import client from './client';

export const startNegotiation = (jobId, userId) => {
  const body = userId ? { job_id: jobId, user_id: userId } : { job_id: jobId };
  return client.post('/negotiations', body);
};
export const getMyNegotiation = () => client.get('/negotiations/me');
export const getNegotiation = (id) => client.get(`/negotiations/${id}`);
export const decideNegotiation = (id, accepted) =>
  client.patch(`/negotiations/${id}`, { accepted });
