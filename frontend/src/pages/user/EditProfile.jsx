// Generated with Claude Code
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, updateMe } from '../../api/users';

export default function EditProfile() {
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone_number: '',
    postal_address: '', birthday: '', biography: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getMe().then(r => {
      const u = r.data;
      setForm({
        first_name: u.first_name || '',
        last_name: u.last_name || '',
        phone_number: u.phone_number || '',
        postal_address: u.postal_address || '',
        birthday: u.birthday || '',
        biography: u.biography || '',
      });
    }).finally(() => setLoading(false));
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await updateMe(form);
      setSuccess('Profile updated!');
      setTimeout(() => navigate('/user/profile'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Edit Profile</h1>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>First Name *</label>
              <input value={form.first_name} onChange={set('first_name')} required />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input value={form.last_name} onChange={set('last_name')} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Phone Number</label>
              <input value={form.phone_number} onChange={set('phone_number')} />
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
          <div className="form-group">
            <label>Biography</label>
            <textarea value={form.biography} onChange={set('biography')} rows={4} placeholder="Tell businesses about yourself…" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate('/user/profile')}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
