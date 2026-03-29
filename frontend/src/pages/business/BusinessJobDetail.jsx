// Generated with Claude Code
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getJob, reportNoShow } from '../../api/jobs';
import { editJob, deleteJob } from '../../api/businesses';
import StatusBadge from '../../components/StatusBadge';
import { format } from 'date-fns';

export default function BusinessJobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [noShowLoading, setNoShowLoading] = useState(false);

  const load = () => {
    setLoading(true);
    getJob(id)
      .then(r => {
        setJob(r.data);
        const j = r.data;
        setEditForm({
          salary_min: j.salary_min,
          salary_max: j.salary_max,
          start_time: format(new Date(j.start_time), "yyyy-MM-dd'T'HH:mm"),
          end_time: format(new Date(j.end_time), "yyyy-MM-dd'T'HH:mm"),
          note: j.note || '',
        });
      })
      .catch(() => setError('Job not found'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      await editJob(id, {
        ...editForm,
        salary_min: parseFloat(editForm.salary_min),
        salary_max: parseFloat(editForm.salary_max),
        start_time: new Date(editForm.start_time).toISOString(),
        end_time: new Date(editForm.end_time).toISOString(),
      });
      setMsg('Job updated!');
      setEditing(false);
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this job? This cannot be undone.')) return;
    try {
      await deleteJob(id);
      navigate('/business/jobs');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Delete failed');
    }
  };

  const handleNoShow = async () => {
    if (!confirm('Report this worker as a no-show? This will cancel the job and suspend the worker.')) return;
    setNoShowLoading(true);
    try {
      await reportNoShow(id);
      setMsg('Worker reported as no-show.');
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to report no-show');
    } finally {
      setNoShowLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading…</div>;
  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>;
  if (!job) return null;

  const effectiveStatus = job.effectiveStatus || job.status;
  const canEdit = effectiveStatus === 'open';
  const canDelete = effectiveStatus === 'open' || effectiveStatus === 'expired';
  const canNoShow = effectiveStatus === 'filled';

  return (
    <div className="page">
      <button className="btn btn-outline btn-sm back-btn" onClick={() => navigate('/business/jobs')}>← Back</button>
      <div className="page-header">
        <div>
          <h1>{job.positionType?.name}</h1>
          {job.worker && <span className="muted">Worker: {job.worker.first_name} {job.worker.last_name}</span>}
        </div>
        <div className="page-header-actions">
          <StatusBadge status={effectiveStatus} />
          {canEdit && <button className="btn btn-outline btn-sm" onClick={() => setEditing(!editing)}>Edit</button>}
          {canDelete && <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>}
        </div>
      </div>

      {msg && <div className="alert alert-info">{msg}</div>}

      {!editing ? (
        <div className="card">
          <div className="detail-grid">
            <div className="detail-row"><span className="detail-label">Salary</span><span>${job.salary_min} – ${job.salary_max}/hr</span></div>
            <div className="detail-row"><span className="detail-label">Start</span><span>{format(new Date(job.start_time), 'PPpp')}</span></div>
            <div className="detail-row"><span className="detail-label">End</span><span>{format(new Date(job.end_time), 'PPpp')}</span></div>
            {job.note && <div className="detail-row"><span className="detail-label">Notes</span><span>{job.note}</span></div>}
          </div>
        </div>
      ) : (
        <div className="card">
          <h2>Edit Job</h2>
          <form onSubmit={handleEdit}>
            <div className="form-row">
              <div className="form-group">
                <label>Min Salary</label>
                <input type="number" step="0.01" value={editForm.salary_min} onChange={e => setEditForm(f => ({ ...f, salary_min: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Max Salary</label>
                <input type="number" step="0.01" value={editForm.salary_max} onChange={e => setEditForm(f => ({ ...f, salary_max: e.target.value }))} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Start Time</label>
                <input type="datetime-local" value={editForm.start_time} onChange={e => setEditForm(f => ({ ...f, start_time: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>End Time</label>
                <input type="datetime-local" value={editForm.end_time} onChange={e => setEditForm(f => ({ ...f, end_time: e.target.value }))} required />
              </div>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea value={editForm.note} onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} rows={3} />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="btn-row">
          <Link to={`/business/jobs/${id}/candidates`} className="btn btn-primary">Browse Candidates</Link>
          <Link to={`/business/interests`} className="btn btn-outline">Mutual Interests</Link>
          {canNoShow && (
            <button className="btn btn-danger" onClick={handleNoShow} disabled={noShowLoading}>
              {noShowLoading ? '…' : 'Report No-Show'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
