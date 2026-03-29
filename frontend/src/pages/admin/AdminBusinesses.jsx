// Generated with Claude Code
import { useState, useEffect } from 'react';
import { listBusinesses, verifyBusiness } from '../../api/businesses';
import Pagination from '../../components/Pagination';
import Avatar from '../../components/Avatar';
import StatusBadge from '../../components/StatusBadge';
import { Link } from 'react-router-dom';

export default function AdminBusinesses() {
  const [businesses, setBusinesses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ keyword: '', activated: '', verified: '' });
  const [actionMsg, setActionMsg] = useState({});
  const limit = 10;

  const load = () => {
    setLoading(true);
    const params = { page, limit, ...filters };
    Object.keys(params).forEach(k => params[k] === '' && delete params[k]);
    listBusinesses(params)
      .then(r => { setBusinesses(r.data.results || []); setTotal(r.data.count || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, filters]);

  const setFilter = k => e => setFilters(f => ({ ...f, [k]: e.target.value }));

  const handleVerify = async (id, verified) => {
    try {
      await verifyBusiness(id, verified);
      setActionMsg(m => ({ ...m, [id]: { type: 'success', text: verified ? 'Verified!' : 'Verification removed' } }));
      load();
    } catch (err) {
      setActionMsg(m => ({ ...m, [id]: { type: 'error', text: err.response?.data?.error || 'Failed' } }));
    }
  };

  return (
    <div className="page">
      <div className="page-header"><h1>Manage Businesses</h1><p className="page-subtitle">{total} businesses</p></div>

      <div className="filter-bar">
        <div className="form-group">
          <label>Search</label>
          <input placeholder="Business name…" value={filters.keyword} onChange={setFilter('keyword')} />
        </div>
        <div className="form-group">
          <label>Activated</label>
          <select value={filters.activated} onChange={setFilter('activated')}>
            <option value="">All</option>
            <option value="true">Activated</option>
            <option value="false">Not Activated</option>
          </select>
        </div>
        <div className="form-group">
          <label>Verified</label>
          <select value={filters.verified} onChange={setFilter('verified')}>
            <option value="">All</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Email</th>
                <th>Owner</th>
                <th>Activated</th>
                <th>Verified</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map(b => (
                <tr key={b.id}>
                  <td>
                    <div className="table-user">
                      <Avatar src={b.avatar} name={b.business_name} size={32} />
                      <Link to={`/businesses/${b.id}`}>{b.business_name}</Link>
                    </div>
                  </td>
                  <td>{b.account?.email || b.email || '—'}</td>
                  <td>{b.owner_name || '—'}</td>
                  <td><StatusBadge status={b.account?.activated || b.activated ? 'approved' : 'created'} /></td>
                  <td><StatusBadge status={b.verified ? 'verified' : 'unverified'} /></td>
                  <td>
                    {actionMsg[b.id] && (
                      <span className={`small text-${actionMsg[b.id].type}`}>{actionMsg[b.id].text}</span>
                    )}
                    {!b.verified ? (
                      <button className="btn btn-success btn-sm" onClick={() => handleVerify(b.id, true)}>
                        Verify
                      </button>
                    ) : (
                      <button className="btn btn-warning btn-sm" onClick={() => handleVerify(b.id, false)}>
                        Unverify
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} limit={limit} onPage={setPage} />
    </div>
  );
}
