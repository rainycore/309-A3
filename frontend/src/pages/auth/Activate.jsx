import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { activateAccount, requestPasswordReset } from '../../api/auth';

export default function Activate() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const navigate = useNavigate();

  const handleActivate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await activateAccount(token, email);
      setSuccess('Account activated! Redirecting to login…');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Activation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) { setError('Enter your email first'); return; }
    setResendLoading(true);
    setError('');
    try {
      const res = await requestPasswordReset(email);
      setSuccess(`New activation token sent. Token: ${res.data.resetToken} (expires: ${new Date(res.data.expiresAt).toLocaleString()})`);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to resend');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Activate Account</h1>
        <p className="auth-subtitle">Enter your activation token from registration</p>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <form onSubmit={handleActivate}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label>Activation Token</label>
            <input value={token} onChange={e => setToken(e.target.value)} required placeholder="Paste your token here" />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Activating…' : 'Activate'}
          </button>
        </form>
        <div className="auth-links">
          <button type="button" className="btn-link" onClick={handleResend} disabled={resendLoading}>
            {resendLoading ? 'Sending…' : 'Resend activation token'}
          </button>
        </div>
        <div className="auth-footer">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
