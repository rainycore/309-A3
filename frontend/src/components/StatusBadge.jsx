const STATUS_COLORS = {
  open: '#22c55e',
  expired: '#f59e0b',
  filled: '#3b82f6',
  completed: '#8b5cf6',
  canceled: '#ef4444',
  approved: '#22c55e',
  rejected: '#ef4444',
  submitted: '#3b82f6',
  revised: '#f59e0b',
  created: '#6b7280',
  active: '#3b82f6',
  pending: '#f59e0b',
  verified: '#22c55e',
  unverified: '#f59e0b',
};

export default function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || '#6b7280';
  return (
    <span className="status-badge" style={{ background: color }}>
      {status}
    </span>
  );
}
