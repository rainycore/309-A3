// Generated with Claude Code
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyInvitations } from '../../api/users';
import { expressInterest } from '../../api/jobs';
import Pagination from '../../components/Pagination';
import StatusBadge from '../../components/StatusBadge';
import { format } from 'date-fns';

export default function Invitations() {
  const [invitations, setInvitations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState({});
  const limit = 10;

  const load = () => {
    setLoading(true);
    getMyInvitations(page, limit)
      .then(r => { setInvitations(r.data.results || []); setTotal(r.data.count || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]);

  const handleAccept = async (jobId) => {
    try {
      await expressInterest(jobId, true);
      setActionMsg(m => ({ ...m, [jobId]: { type: 'success', text: 'Interest expressed! Check Interests page to negotiate.' } }));
      load();
    } catch (err) {
      setActionMsg(m => ({ ...m, [jobId]: { type: 'error', text: err.response?.data?.error || 'Failed' } }));
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Invitations</h1>
        <p className="page-subtitle">Businesses that have expressed interest in you</p>
      </div>
      {loading ? (
        <div className="loading">Loading…</div>
      ) : invitations.length === 0 ? (
        <div className="empty-state">No invitations yet.</div>
      ) : (
        <div className="job-list">
          {invitations.map(inv => {
            const job = inv.job || inv;
            return (
              <div key={job.id || inv.id} className="job-card card">
                <div className="job-card-header">
                  <div>
                    <h3>{job.positionType?.name}</h3>
                    <span className="job-business">{job.business?.business_name}</span>
                  </div>
                  <StatusBadge status={job.effectiveStatus || job.status || 'open'} />
                </div>
                <div className="job-details">
                  <span>💰 ${job.salary_min} – ${job.salary_max}/hr</span>
                  <span>📅 {format(new Date(job.start_time), 'MMM d, h:mm a')}</span>
                </div>
                {actionMsg[job.id] && (
                  <div className={`alert alert-${actionMsg[job.id].type}`}>{actionMsg[job.id].text}</div>
                )}
                <div className="btn-row">
                  <Link to={`/jobs/${job.id}`} className="btn btn-outline btn-sm">View Job</Link>
                  {!inv.candidateInterested && (
                    <button className="btn btn-primary btn-sm" onClick={() => handleAccept(job.id)}>
                      Express Interest
                    </button>
                  )}
                  {inv.candidateInterested && (
                    <span className="badge badge-success">You expressed interest</span>
                  )}
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
