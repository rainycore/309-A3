import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createJob } from '../../api/businesses';
import { listPositionTypes } from '../../api/positionTypes';
import { format, addHours } from 'date-fns';

export default function CreateJob() {
  const [form, setForm] = useState({
    position_type_id: '',
    salary_min: '',
    salary_max: '',
    start_time: '',
    end_time: '',
    note: '',
  });
  const [posTypes, setPosTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    listPositionTypes({ limit: 100 }).then(r => setPosTypes(r.data.results || []));
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (parseFloat(form.salary_max) < parseFloat(form.salary_min)) {
      setError('Maximum salary must be ≥ minimum salary');
      return;
    }
    setLoading(true);
    try {
      await createJob({
        position_type_id: parseInt(form.position_type_id),
        salary_min: parseFloat(form.salary_min),
        salary_max: parseFloat(form.salary_max),
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        note: form.note || undefined,
      });
      navigate('/business/jobs');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  // Helper: default to 2h from now
  const now = new Date();
  const defaultStart = format(addHours(now, 2), "yyyy-MM-dd'T'HH:mm");
  const defaultEnd = format(addHours(now, 4), "yyyy-MM-dd'T'HH:mm");

  return (
    <div className="page">
      <div className="page-header"><h1>Post New Job</h1></div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Position Type *</label>
            <select value={form.position_type_id} onChange={set('position_type_id')} required>
              <option value="">Select a position type…</option>
              {posTypes.map(pt => (
                <option key={pt.id} value={pt.id}>{pt.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Min Salary ($/hr) *</label>
              <input type="number" step="0.01" min="0" value={form.salary_min} onChange={set('salary_min')} required />
            </div>
            <div className="form-group">
              <label>Max Salary ($/hr) *</label>
              <input type="number" step="0.01" min="0" value={form.salary_max} onChange={set('salary_max')} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Start Time *</label>
              <input
                type="datetime-local"
                value={form.start_time}
                onChange={set('start_time')}
                min={defaultStart}
                required
              />
              <p className="hint">Must be within 1 week, allow 15+ min for negotiation</p>
            </div>
            <div className="form-group">
              <label>End Time *</label>
              <input
                type="datetime-local"
                value={form.end_time}
                onChange={set('end_time')}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea value={form.note} onChange={set('note')} rows={3} placeholder="Additional details about the job…" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate('/business/jobs')}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Posting…' : 'Post Job'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
