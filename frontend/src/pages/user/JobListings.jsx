// Generated with Claude Code
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listJobs } from '../../api/jobs';
import { listPositionTypes } from '../../api/positionTypes';
import Pagination from '../../components/Pagination';
import StatusBadge from '../../components/StatusBadge';
import { format } from 'date-fns';

export default function JobListings() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [posTypes, setPosTypes] = useState([]);

  const [filters, setFilters] = useState({
    position_type_id: '',
    sort: 'updatedAt',
    lat: '', lon: '',
  });

  const limit = 10;

  useEffect(() => {
    listPositionTypes({ limit: 100 }).then(r => setPosTypes(r.data.results || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit, sort: filters.sort };
    if (filters.position_type_id) params.position_type_id = filters.position_type_id;
    if (filters.lat && filters.lon) { params.lat = filters.lat; params.lon = filters.lon; }
    listJobs(params)
      .then(r => { setJobs(r.data.results || []); setTotal(r.data.count || 0); })
      .catch(err => setError(err.response?.data?.error || 'Failed to load jobs'))
      .finally(() => setLoading(false));
  }, [page, filters]);

  const setFilter = k => e => setFilters(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="page">
      <div className="page-header">
        <h1>Available Jobs</h1>
        <p className="page-subtitle">Jobs matching your qualifications</p>
      </div>

      <div className="filter-bar">
        <div className="form-group">
          <label>Position Type</label>
          <select value={filters.position_type_id} onChange={setFilter('position_type_id')}>
            <option value="">All positions</option>
            {posTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Sort By</label>
          <select value={filters.sort} onChange={setFilter('sort')}>
            <option value="updatedAt">Recently Updated</option>
            <option value="salary">Salary</option>
            <option value="start_time">Start Time</option>
            <option value="distance">Distance</option>
            <option value="eta">ETA</option>
          </select>
        </div>
        <div className="form-group">
          <label>Your Latitude</label>
          <input type="number" step="any" placeholder="43.6532" value={filters.lat} onChange={setFilter('lat')} />
        </div>
        <div className="form-group">
          <label>Your Longitude</label>
          <input type="number" step="any" placeholder="-79.3832" value={filters.lon} onChange={setFilter('lon')} />
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => { setFilters({ position_type_id: '', sort: 'updatedAt', lat: '', lon: '' }); setPage(1); }}>
          Reset
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Loading jobs…</div>
      ) : jobs.length === 0 ? (
        <div className="empty-state">
          <p>No available jobs found. Make sure you have approved qualifications and are set as available.</p>
          <Link to="/user/qualifications" className="btn btn-primary">Manage Qualifications</Link>
        </div>
      ) : (
        <div className="job-list">
          {jobs.map(job => (
            <Link key={job.id} to={`/jobs/${job.id}`} className="job-card card">
              <div className="job-card-header">
                <div>
                  <h3>{job.position_type?.name}</h3>
                  <span className="job-business">{job.business?.business_name}</span>
                </div>
                <StatusBadge status="open" />
              </div>
              <div className="job-details">
                <span>💰 ${job.salary_min} – ${job.salary_max}/hr</span>
                <span>📅 {format(new Date(job.start_time), 'MMM d, h:mm a')} – {format(new Date(job.end_time), 'h:mm a')}</span>
                {job.distance != null && <span>📍 {job.distance.toFixed(1)} km away</span>}
                {job.eta != null && <span>🕐 {Math.round(job.eta)} min ETA</span>}
              </div>
              {job.note && <p className="job-note muted">{job.note}</p>}
            </Link>
          ))}
        </div>
      )}
      <Pagination page={page} total={total} limit={limit} onPage={p => { setPage(p); window.scrollTo(0, 0); }} />
    </div>
  );
}
