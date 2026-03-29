// Generated with Claude Code
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQualification, updateQualification } from '../../api/qualifications';
import StatusBadge from '../../components/StatusBadge';
import { API_BASE } from '../../api/client';

export default function QualificationReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [qual, setQual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getQualification(id)
      .then(r => { setQual(r.data); setNote(r.data.note || ''); })
      .catch(() => setError('Qualification not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDecision = async (status) => {
    setSaving(true);
    try {
      await updateQualification(id, { status, note });
      setMsg(`Qualification ${status}!`);
      setTimeout(() => navigate('/admin/qualifications'), 1500);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading…</div>;
  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>;
  if (!qual) return null;

  const canDecide = qual.status === 'submitted' || qual.status === 'revised';

  return (
    <div className="page">
      <button className="btn btn-outline btn-sm back-btn" onClick={() => navigate('/admin/qualifications')}>
        ← Back
      </button>
      <div className="page-header">
        <h1>Review Qualification</h1>
        <StatusBadge status={qual.status} />
      </div>

      {msg && <div className="alert alert-info">{msg}</div>}

      <div className="card">
        <h2>Applicant</h2>
        <div className="detail-grid">
          <div className="detail-row"><span className="detail-label">Name</span><span>{qual.user?.first_name} {qual.user?.last_name}</span></div>
          <div className="detail-row"><span className="detail-label">Email</span><span>{qual.user?.account?.email}</span></div>
          <div className="detail-row"><span className="detail-label">Position Type</span><span>{qual.positionType?.name}</span></div>
          <div className="detail-row"><span className="detail-label">Status</span><span><StatusBadge status={qual.status} /></span></div>
          <div className="detail-row"><span className="detail-label">Submitted</span><span>{new Date(qual.updatedAt).toLocaleString()}</span></div>
        </div>
      </div>

      {qual.document && (
        <div className="card">
          <h2>Qualification Document</h2>
          <a href={`${API_BASE}${qual.document}`} target="_blank" rel="noreferrer" className="btn btn-outline">
            📄 View Document (PDF)
          </a>
        </div>
      )}

      {qual.user?.resume && (
        <div className="card">
          <h2>Resume</h2>
          <a href={`${API_BASE}${qual.user.resume}`} target="_blank" rel="noreferrer" className="btn btn-outline">
            📄 View Resume (PDF)
          </a>
        </div>
      )}

      {qual.user?.biography && (
        <div className="card">
          <h2>Biography</h2>
          <p>{qual.user.biography}</p>
        </div>
      )}

      <div className="card">
        <h2>Admin Note</h2>
        <p className="muted small">Your note will be visible to the applicant.</p>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={4}
          placeholder="Add a review note (optional)…"
          disabled={!canDecide}
        />
        {canDecide ? (
          <div className="btn-row review-actions">
            <button
              className="btn btn-success"
              onClick={() => handleDecision('approved')}
              disabled={saving}
            >
              ✓ Approve
            </button>
            <button
              className="btn btn-danger"
              onClick={() => handleDecision('rejected')}
              disabled={saving}
            >
              ✗ Reject
            </button>
          </div>
        ) : (
          <div className="alert alert-info">
            This qualification has status <strong>{qual.status}</strong> and cannot be reviewed now.
          </div>
        )}
      </div>
    </div>
  );
}
