// Generated with Claude Code
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listMyJobs } from '../../api/businesses';
import { listPositionTypes } from '../../api/positionTypes';
import Pagination from '../../components/Pagination';
import StatusBadge from '../../components/StatusBadge';
import { format } from 'date-fns';

export default function BusinessJobs() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [posTypes, setPosTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: '', position_type_id: '', sort: 'updatedAt' });
  const limit = 10;

  useEffect(() => {
    listPositionTypes({ limit: 100 }).then(r => setPosTypes(r.data.results || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit, ...filters };
    Object.keys(params).forEach(k => !params[k] && delete params[k]);
    listMyJobs(params)
      .then(r => { setJobs(r.data.results || []); setTotal(r.data.count || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, filters]);

  const setFilter = k => e => setFilters(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Jobs</h1>
        <Link to="/business/jobs/new" className="btn btn-primary">+ Post Job</Link>
      </div>

      <div className="filter-bar">
        <div className="form-group">
          <label>Status</label>
          <select value={filters.status} onChange={setFilter('status')}>
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="expired">Expired</option>
            <option value="filled">Filled</option>
            <option value="completed">Completed</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
        <div className="form-group">
          <label>Position</label>
          <select value={filters.position_type_id} onChange={setFilter('position_type_id')}>
            <option value="">All</option>
            {posTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
          </select>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => { setFilters({ status: '', position_type_id: '', sort: 'updatedAt' }); setPage(1); }}>
          Reset
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading jobs…</div>
      ) : jobs.length === 0 ? (
        <div className="empty-state">
          <p>No jobs yet.</p>
          <Link to="/business/jobs/new" className="btn btn-primary">Post Your First Job</Link>
        </div>
      ) : (
        <div className="job-list">
          {jobs.map(job => (
            <Link key={job.id} to={`/business/jobs/${job.id}`} className="job-card card">
              <div className="job-card-header">
                <div>
                  <h3>{job.positionType?.name}</h3>
                  {job.worker && <span className="muted small">Worker: {job.worker.first_name} {job.worker.last_name}</span>}
                </div>
                <StatusBadge status={job.effectiveStatus || job.status} />
              </div>
              <div className="job-details">
                <span>💰 ${job.salary_min} – ${job.salary_max}/hr</span>
                <span>📅 {format(new Date(job.start_time), 'MMM d, h:mm a')} – {format(new Date(job.end_time), 'h:mm a')}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
      <Pagination page={page} total={total} limit={limit} onPage={setPage} />
    </div>
  );
}
