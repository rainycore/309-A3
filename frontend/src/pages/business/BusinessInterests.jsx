import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listMyJobs } from '../../api/businesses';
import { listJobInterests } from '../../api/jobs';
import { startNegotiation, getMyNegotiation } from '../../api/negotiations';
import Pagination from '../../components/Pagination';
import StatusBadge from '../../components/StatusBadge';
import { format } from 'date-fns';

export default function BusinessInterests() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [interests, setInterests] = useState([]);
  const [intTotal, setIntTotal] = useState(0);
  const [intPage, setIntPage] = useState(1);
  const [activeNeg, setActiveNeg] = useState(null);
  const [actionMsg, setActionMsg] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const limit = 10;

  useEffect(() => {
    listMyJobs({ limit: 100 }).then(r => setJobs(r.data.results || []));
    getMyNegotiation().then(r => setActiveNeg(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedJob) return;
    setLoading(true);
    listJobInterests(selectedJob.id, { page: intPage, limit })
      .then(r => { setInterests(r.data.results || []); setIntTotal(r.data.count || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedJob, intPage]);

  const handleNegotiate = async (jobId, userId) => {
    try {
      await startNegotiation(jobId, userId);
      navigate('/negotiation');
    } catch (err) {
      setActionMsg(m => ({ ...m, [userId]: err.response?.data?.error || 'Cannot start negotiation' }));
    }
  };

  const mutualInterests = interests.filter(i => i.candidateInterested && i.businessInterested);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Mutual Interests</h1>
        <p className="page-subtitle">Workers who have mutual interest for your jobs</p>
      </div>

      {activeNeg && (
        <div className="alert alert-warning">
          <strong>Active Negotiation!</strong>{' '}
          <Link to="/negotiation" className="btn btn-primary btn-sm">Go to Negotiation</Link>
        </div>
      )}

      <div className="form-group">
        <label>Select a Job</label>
        <select
          value={selectedJob?.id || ''}
          onChange={e => {
            const job = jobs.find(j => j.id === parseInt(e.target.value));
            setSelectedJob(job || null);
            setIntPage(1);
          }}
        >
          <option value="">Select a job…</option>
          {jobs.filter(j => (j.effectiveStatus || j.status) === 'open').map(j => (
            <option key={j.id} value={j.id}>
              {j.positionType?.name} — {format(new Date(j.start_time), 'MMM d')}
            </option>
          ))}
        </select>
      </div>

      {selectedJob && (
        <>
          {loading ? (
            <div className="loading">Loading…</div>
          ) : mutualInterests.length === 0 ? (
            <div className="empty-state">No mutual interests yet for this job.</div>
          ) : (
            <div className="candidate-list">
              {mutualInterests.map(interest => {
                const user = interest.user;
                const canNeg = !activeNeg;
                return (
                  <div key={interest.id} className="candidate-card card">
                    <div className="candidate-header">
                      <div>
                        <h3>{user?.first_name} {user?.last_name}</h3>
                        <span className="badge badge-mutual">🤝 Mutual Interest</span>
                      </div>
                    </div>
                    {actionMsg[user?.id] && (
                      <div className="alert alert-error">{actionMsg[user?.id]}</div>
                    )}
                    <div className="btn-row">
                      <Link to={`/business/jobs/${selectedJob.id}/candidates/${user?.id}`} className="btn btn-outline btn-sm">
                        View Profile
                      </Link>
                      {canNeg ? (
                        <button className="btn btn-primary btn-sm" onClick={() => handleNegotiate(selectedJob.id, user?.id)}>
                          Start Negotiation
                        </button>
                      ) : (
                        <span className="muted small">Finish active negotiation first</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Pagination page={intPage} total={intTotal} limit={limit} onPage={setIntPage} />
        </>
      )}
    </div>
  );
}
