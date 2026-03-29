// Generated with Claude Code
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children, roles }) {
  const { token, role, loading } = useAuth();
  const location = useLocation();

  const effectiveToken = token || localStorage.getItem('token');
  const effectiveRole = role || localStorage.getItem('role');
  if (loading) return <div className="loading">Loading…</div>;
  if (!effectiveToken) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(effectiveRole)) return <Navigate to="/" replace />;
  return children;
}
