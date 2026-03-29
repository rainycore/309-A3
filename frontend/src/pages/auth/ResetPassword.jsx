// Generated with Claude Code
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { resetPassword } from '../../api/auth';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    try {
      await resetPassword(token, email, password);
      setSuccess('Password reset! Redirecting to login…');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Set New Password</h1>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Reset Token</label>
            <input value={token} onChange={e => setToken(e.target.value)} required placeholder="Paste token here" />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 8 chars, upper/lower/digit/special" />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Resetting…' : 'Reset Password'}
          </button>
        </form>
        <div className="auth-footer">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
