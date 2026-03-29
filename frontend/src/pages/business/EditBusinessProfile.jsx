// Generated with Claude Code
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyBusiness, updateMyBusiness, uploadBusinessAvatar } from '../../api/businesses';

export default function EditBusinessProfile() {
  const [form, setForm] = useState({
    business_name: '', owner_name: '', phone_number: '',
    postal_address: '', biography: '',
    location_lon: '', location_lat: '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getMyBusiness().then(r => {
      const b = r.data;
      setForm({
        business_name: b.business_name || '',
        owner_name: b.owner_name || '',
        phone_number: b.phone_number || '',
        postal_address: b.postal_address || '',
        biography: b.biography || '',
        location_lon: b.location_lon ?? '',
        location_lat: b.location_lat ?? '',
      });
    }).finally(() => setLoading(false));
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const payload = { ...form };
      if (form.location_lon && form.location_lat) {
        payload.location = { lon: parseFloat(form.location_lon), lat: parseFloat(form.location_lat) };
      }
      delete payload.location_lon; delete payload.location_lat;
      await updateMyBusiness(payload);
      setSuccess('Profile updated!');
      setTimeout(() => navigate('/business/profile'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    e.preventDefault();
    if (!avatarFile) return;
    setUploading(true);
    try {
      await uploadBusinessAvatar(avatarFile);
      setSuccess('Avatar updated!');
    } catch (err) {
      setError(err.response?.data?.error || 'Avatar upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div className="page">
      <div className="page-header"><h1>Edit Business Profile</h1></div>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <h2>Avatar</h2>
        <form onSubmit={handleAvatarUpload} className="upload-form">
          <input type="file" accept="image/png,image/jpeg" onChange={e => setAvatarFile(e.target.files[0])} />
          <p className="hint">PNG or JPEG, max 5MB</p>
          <button type="submit" className="btn btn-outline" disabled={!avatarFile || uploading}>
            {uploading ? 'Uploading…' : 'Upload Avatar'}
          </button>
        </form>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Business Name *</label>
              <input value={form.business_name} onChange={set('business_name')} required />
            </div>
            <div className="form-group">
              <label>Owner Name *</label>
              <input value={form.owner_name} onChange={set('owner_name')} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Phone *</label>
              <input value={form.phone_number} onChange={set('phone_number')} required />
            </div>
            <div className="form-group">
              <label>Address *</label>
              <input value={form.postal_address} onChange={set('postal_address')} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Longitude</label>
              <input type="number" step="any" value={form.location_lon} onChange={set('location_lon')} />
            </div>
            <div className="form-group">
              <label>Latitude</label>
              <input type="number" step="any" value={form.location_lat} onChange={set('location_lat')} />
            </div>
          </div>
          <div className="form-group">
            <label>Biography</label>
            <textarea value={form.biography} onChange={set('biography')} rows={4} placeholder="Tell workers about your business…" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate('/business/profile')}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
