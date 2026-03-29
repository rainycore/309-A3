// Generated with Claude Code
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listMyInterests } from '../../api/jobs';
import { startNegotiation, getMyNegotiation } from '../../api/negotiations';
import Pagination from '../../components/Pagination';
import StatusBadge from '../../components/StatusBadge';
import { format } from 'date-fns';

export default function Interests() {
  const [interests, setInterests] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [activeNeg, setActiveNeg] = useState(null);
  const [actionMsg, setActionMsg] = useState({});
  const navigate = useNavigate();
  const limit = 10;

  const load = async () => {
    setLoading(true);
    try {
      const [intRes, negRes] = await Promise.allSettled([
        listMyInterests({ page, limit }),
        getMyNegotiation(),
      ]);
      if (intRes.status === 'fulfilled') {
        setInterests(intRes.value.data.results || []);
        setTotal(intRes.value.data.count || 0);
      }
      if (negRes.status === 'fulfilled') {
        setActiveNeg(negRes.value.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  const handleNegotiate = async (jobId) => {
    try {
      await startNegotiation(jobId);
      navigate('/negotiation');
    } catch (err) {
      setActionMsg(m => ({ ...m, [jobId]: err.response?.data?.error || 'Cannot start negotiation' }));
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Interests</h1>
        <p className="page-subtitle">Jobs you've expressed interest in</p>
      </div>

      {activeNeg && (
        <div className="alert alert-warning">
          <strong>Active Negotiation!</strong> You have an ongoing negotiation for a job.{' '}
          <Link to="/negotiation" className="btn btn-primary btn-sm">Go to Negotiation</Link>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading…</div>
      ) : interests.length === 0 ? (
        <div className="empty-state">
          <p>No interests yet. Browse available jobs to express interest.</p>
          <Link to="/jobs" className="btn btn-primary">Browse Jobs</Link>
        </div>
      ) : (
        <div className="job-list">
          {interests.map(interest => {
            const job = interest.job || interest;
            const isMutual = interest.candidateInterested && interest.businessInterested;
            const effectiveStatus = job.effectiveStatus || job.status;
            const canNegotiate = isMutual && effectiveStatus === 'open' && !activeNeg;

            return (
              <div key={interest.id || job.id} className="job-card card">
                <div className="job-card-header">
                  <div>
                    <h3>{job.position_type?.name}</h3>
                    <span className="job-business">{job.business?.business_name}</span>
                  </div>
                  <div>
                    <StatusBadge status={effectiveStatus} />
                    {isMutual && <span className="badge badge-mutual">🤝 Mutual</span>}
                  </div>
                </div>
                <div className="job-details">
                  <span>💰 ${job.salary_min} – ${job.salary_max}/hr</span>
                  <span>📅 {format(new Date(job.start_time), 'MMM d, h:mm a')} – {format(new Date(job.end_time), 'h:mm a')}</span>
                </div>
                <div className="interest-indicators">
                  <span className={`ind ${interest.candidateInterested ? 'yes' : 'no'}`}>
                    {interest.candidateInterested ? '✓ You' : '○ You'}
                  </span>
                  <span className={`ind ${interest.businessInterested ? 'yes' : 'no'}`}>
                    {interest.businessInterested ? '✓ Business' : '○ Business'}
                  </span>
                </div>
                {actionMsg[job.id] && <div className="alert alert-error">{actionMsg[job.id]}</div>}
                <div className="btn-row">
                  <Link to={`/jobs/${job.id}`} className="btn btn-outline btn-sm">View Job</Link>
                  {canNegotiate && (
                    <button className="btn btn-primary btn-sm" onClick={() => handleNegotiate(job.id)}>
                      Start Negotiation
                    </button>
                  )}
                  {isMutual && effectiveStatus === 'open' && activeNeg && (
                    <span className="muted small">Finish your active negotiation first</span>
                  )}
                  {!isMutual && <span className="muted small">Waiting for mutual interest</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Pagination page={page} total={total} limit={limit} onPage={setPage} />
    </div>
  );
}
