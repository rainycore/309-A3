import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { listCandidates, inviteCandidate, getJob } from '../../api/jobs';
import Pagination from '../../components/Pagination';
import Avatar from '../../components/Avatar';
import StatusBadge from '../../components/StatusBadge';

export default function Candidates() {
  const { jobId } = useParams();
  const [candidates, setCandidates] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState({});
  const limit = 10;

  useEffect(() => {
    getJob(jobId).then(r => setJob(r.data)).catch(() => {});
  }, [jobId]);

  const load = () => {
    setLoading(true);
    listCandidates(jobId, { page, limit })
      .then(r => { setCandidates(r.data.results || []); setTotal(r.data.count || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, jobId]);

  const handleInvite = async (userId, interested) => {
    try {
      await inviteCandidate(jobId, userId, interested);
      setActionMsg(m => ({
        ...m,
        [userId]: { type: 'success', text: interested ? 'Invited!' : 'Invitation withdrawn' }
      }));
      load();
    } catch (err) {
      setActionMsg(m => ({
        ...m,
        [userId]: { type: 'error', text: err.response?.data?.error || 'Action failed' }
      }));
    }
  };

  return (
    <div className="page">
      <button className="btn btn-outline btn-sm back-btn" onClick={() => window.history.back()}>← Back</button>
      <div className="page-header">
        <h1>Candidates for {job?.positionType?.name}</h1>
        <p className="page-subtitle">Qualified workers available for this job</p>
      </div>

      {loading ? (
        <div className="loading">Loading candidates…</div>
      ) : candidates.length === 0 ? (
        <div className="empty-state">No available candidates found for this position.</div>
      ) : (
        <div className="candidate-list">
          {candidates.map(c => (
            <div key={c.id} className="candidate-card card">
              <div className="candidate-header">
                <Avatar src={c.avatar} name={`${c.first_name} ${c.last_name}`} size={48} />
                <div className="candidate-info">
                  <h3>{c.first_name} {c.last_name}</h3>
                  {c.invited && <StatusBadge status="filled" />}
                  {c.candidateInterested && <span className="badge badge-success">Interested</span>}
                </div>
              </div>
              {c.biography && <p className="muted">{c.biography.slice(0, 120)}…</p>}
              {actionMsg[c.id] && (
                <div className={`alert alert-${actionMsg[c.id].type}`}>{actionMsg[c.id].text}</div>
              )}
              <div className="btn-row">
                <Link to={`/business/jobs/${jobId}/candidates/${c.id}`} className="btn btn-outline btn-sm">
                  View Details
                </Link>
                {!c.invited ? (
                  <button className="btn btn-primary btn-sm" onClick={() => handleInvite(c.id, true)}>
                    Invite
                  </button>
                ) : (
                  <button className="btn btn-outline btn-sm" onClick={() => handleInvite(c.id, false)}>
                    Withdraw Invite
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} total={total} limit={limit} onPage={setPage} />
    </div>
  );
}
