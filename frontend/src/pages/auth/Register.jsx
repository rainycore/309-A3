import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../../api/users';
import { registerBusiness } from '../../api/businesses';

export default function Register() {
  const [type, setType] = useState('regular');
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '', confirm: '',
    phone_number: '', postal_address: '', birthday: '',
    business_name: '', owner_name: '',
    location_lon: '', location_lat: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      if (type === 'regular') {
        const payload = {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          password: form.password,
          phone_number: form.phone_number || undefined,
          postal_address: form.postal_address || undefined,
          birthday: form.birthday || undefined,
        };
        const res = await registerUser(payload);
        setSuccess(`Account created! Your activation token is: ${res.data.resetToken}. Please activate your account.`);
        setTimeout(() => navigate('/activate'), 3000);
      } else {
        const lon = parseFloat(form.location_lon);
        const lat = parseFloat(form.location_lat);
        if (isNaN(lon) || isNaN(lat)) { setError('Please enter valid coordinates'); setLoading(false); return; }
        const payload = {
          business_name: form.business_name,
          owner_name: form.owner_name,
          email: form.email,
          password: form.password,
          phone_number: form.phone_number,
          postal_address: form.postal_address,
          location: { lon, lat },
        };
        const res = await registerBusiness(payload);
        setSuccess(`Business registered! Your activation token is: ${res.data.resetToken}. Please activate your account.`);
        setTimeout(() => navigate('/activate'), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card wide">
        <h1>Create Account</h1>
        <div className="type-toggle">
          <button
            type="button"
            className={`type-btn ${type === 'regular' ? 'active' : ''}`}
            onClick={() => setType('regular')}
          >Job Seeker</button>
          <button
            type="button"
            className={`type-btn ${type === 'business' ? 'active' : ''}`}
            onClick={() => setType('business')}
          >Business</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Email *</label>
              <input type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
            </div>
            <div className="form-group">
              <label>Password *</label>
              <input type="password" value={form.password} onChange={set('password')} required placeholder="Min 8 chars, upper/lower/digit/special" />
            </div>
            <div className="form-group">
              <label>Confirm Password *</label>
              <input type="password" value={form.confirm} onChange={set('confirm')} required placeholder="••••••••" />
            </div>
          </div>

          {type === 'regular' && (
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input value={form.first_name} onChange={set('first_name')} required />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input value={form.last_name} onChange={set('last_name')} required />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input value={form.phone_number} onChange={set('phone_number')} placeholder="(416) 555-0100" />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input value={form.postal_address} onChange={set('postal_address')} />
              </div>
              <div className="form-group">
                <label>Birthday</label>
                <input type="date" value={form.birthday} onChange={set('birthday')} />
              </div>
            </div>
          )}

          {type === 'business' && (
            <div className="form-row">
              <div className="form-group">
                <label>Business Name *</label>
                <input value={form.business_name} onChange={set('business_name')} required />
              </div>
              <div className="form-group">
                <label>Owner Name *</label>
                <input value={form.owner_name} onChange={set('owner_name')} required />
              </div>
              <div className="form-group">
                <label>Phone Number *</label>
                <input value={form.phone_number} onChange={set('phone_number')} required />
              </div>
              <div className="form-group">
                <label>Address *</label>
                <input value={form.postal_address} onChange={set('postal_address')} required />
              </div>
              <div className="form-group">
                <label>Longitude *</label>
                <input type="number" step="any" value={form.location_lon} onChange={set('location_lon')} required placeholder="-79.3832" />
              </div>
              <div className="form-group">
                <label>Latitude *</label>
                <input type="number" step="any" value={form.location_lat} onChange={set('location_lat')} required placeholder="43.6532" />
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
