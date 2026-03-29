// Generated with Claude Code
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getJob, expressInterest } from '../../api/jobs';
import { getMyInterests } from '../../api/users';
import StatusBadge from '../../components/StatusBadge';
import { format } from 'date-fns';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [myInterest, setMyInterest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const [jobRes] = await Promise.all([getJob(id)]);
      setJob(jobRes.data);
    } catch (e) {
      setError('Job not found or access denied');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleInterest = async (interested) => {
    setActionLoading(true);
    setMsg('');
    try {
      await expressInterest(id, interested);
      setMsg(interested ? 'Interest expressed!' : 'Interest withdrawn');
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading…</div>;
  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>;
  if (!job) return null;

  const interest = job.userInterest;
  const candidateInterested = interest?.candidateInterested;
  const businessInterested = interest?.businessInterested;
  const effectiveStatus = job.effectiveStatus || job.status;
  const canInteract = effectiveStatus === 'open';

  return (
    <div className="page">
      <button className="btn btn-outline btn-sm back-btn" onClick={() => navigate(-1)}>← Back</button>
      <div className="page-header">
        <div>
          <h1>{job.position_type?.name}</h1>
          <span className="job-business">{job.business?.business_name}</span>
        </div>
        <StatusBadge status={effectiveStatus} />
      </div>

      {msg && <div className="alert alert-info">{msg}</div>}

      <div className="card">
        <div className="detail-grid">
          <div className="detail-row"><span className="detail-label">Salary</span><span>${job.salary_min} – ${job.salary_max} / hr</span></div>
          <div className="detail-row"><span className="detail-label">Start</span><span>{format(new Date(job.start_time), 'PPpp')}</span></div>
          <div className="detail-row"><span className="detail-label">End</span><span>{format(new Date(job.end_time), 'PPpp')}</span></div>
          {job.distance != null && <div className="detail-row"><span className="detail-label">Distance</span><span>{job.distance.toFixed(1)} km</span></div>}
          {job.eta != null && <div className="detail-row"><span className="detail-label">ETA</span><span>{Math.round(job.eta)} min</span></div>}
          {job.note && <div className="detail-row"><span className="detail-label">Notes</span><span>{job.note}</span></div>}
        </div>
      </div>

      {canInteract && (
        <div className="card interest-panel">
          <h2>Your Interest</h2>
          <div className="interest-status">
            <div className={`interest-indicator ${candidateInterested ? 'yes' : 'no'}`}>
              {candidateInterested ? '✓ You are interested' : '✗ You have not expressed interest'}
            </div>
            <div className={`interest-indicator ${businessInterested ? 'yes' : 'no'}`}>
              {businessInterested ? '✓ Business is interested in you' : 'Business has not expressed interest yet'}
            </div>
          </div>
          {candidateInterested && businessInterested && (
            <div className="alert alert-success">
              🎉 Mutual interest! Check your <Link to="/user/interests">interests page</Link> to start a negotiation.
            </div>
          )}
          <div className="btn-row">
            {!candidateInterested ? (
              <button className="btn btn-primary" onClick={() => handleInterest(true)} disabled={actionLoading}>
                {actionLoading ? '…' : '✓ Express Interest'}
              </button>
            ) : (
              <button className="btn btn-warning" onClick={() => handleInterest(false)} disabled={actionLoading}>
                {actionLoading ? '…' : '✗ Withdraw Interest'}
              </button>
            )}
          </div>
        </div>
      )}

      {!canInteract && (
        <div className="alert alert-info">
          This job is <strong>{effectiveStatus}</strong> and is no longer accepting interest.
        </div>
      )}
    </div>
  );
}
