import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../../api/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await requestPasswordReset(email);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Reset Password</h1>
        {error && <div className="alert alert-error">{error}</div>}
        {result ? (
          <div className="alert alert-success">
            <p>Reset token generated!</p>
            <p><strong>Token:</strong> <code>{result.resetToken}</code></p>
            <p><strong>Expires:</strong> {new Date(result.expiresAt).toLocaleString()}</p>
            <p>Use this token on the <Link to="/reset-password">Reset Password page</Link>.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Sending…' : 'Send Reset Token'}
            </button>
          </form>
        )}
        <div className="auth-footer">
          <Link to="/login">Back to login</Link>
          {' · '}
          <Link to="/reset-password">Already have a token?</Link>
        </div>
      </div>
    </div>
  );
}
