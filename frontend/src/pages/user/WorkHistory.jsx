import { useState, useEffect } from 'react';
import { getMe } from '../../api/users';
import StatusBadge from '../../components/StatusBadge';
import { format } from 'date-fns';

export default function WorkHistory() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe().then(r => setUser(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading…</div>;
  if (!user) return null;

  const filledJobs = user.filledJobs || [];
  const current = filledJobs.filter(j => {
    const status = j.effectiveStatus || j.status;
    return status === 'filled';
  });
  const past = filledJobs.filter(j => {
    const status = j.effectiveStatus || j.status;
    return status === 'completed' || status === 'canceled';
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1>Work History</h1>
        <p className="page-subtitle">Your confirmed jobs and work commitments</p>
      </div>

      <section>
        <h2>Current Commitments ({current.length})</h2>
        {current.length === 0 ? (
          <div className="empty-state">No active work commitments.</div>
        ) : (
          <div className="job-list">
            {current.map(job => (
              <JobHistoryCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2>Past Jobs ({past.length})</h2>
        {past.length === 0 ? (
          <div className="empty-state">No completed jobs yet.</div>
        ) : (
          <div className="job-list">
            {past.map(job => (
              <JobHistoryCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function JobHistoryCard({ job }) {
  const effectiveStatus = job.effectiveStatus || job.status;
  return (
    <div className="job-card card">
      <div className="job-card-header">
        <div>
          <h3>{job.positionType?.name}</h3>
          <span className="job-business">{job.business?.business_name}</span>
        </div>
        <StatusBadge status={effectiveStatus} />
      </div>
      <div className="job-details">
        <span>💰 ${job.salary_min} – ${job.salary_max}/hr</span>
        <span>📅 {format(new Date(job.start_time), 'PPp')} – {format(new Date(job.end_time), 'PPp')}</span>
      </div>
    </div>
  );
}
