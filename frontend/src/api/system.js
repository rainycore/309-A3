// Generated with Claude Code
import client from './client';

export const setResetCooldown = (v) =>
  client.patch('/system/reset-cooldown', { reset_cooldown: v });
export const setNegotiationWindow = (v) =>
  client.patch('/system/negotiation-window', { negotiation_window: v });
export const setJobStartWindow = (v) =>
  client.patch('/system/job-start-window', { job_start_window: v });
export const setAvailabilityTimeout = (v) =>
  client.patch('/system/availability-timeout', { availability_timeout: v });
