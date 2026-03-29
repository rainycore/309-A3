// Generated with Claude Code
import { useState, useEffect } from 'react';
import { listUsers, suspendUser } from '../../api/users';
import Pagination from '../../components/Pagination';
import Avatar from '../../components/Avatar';
import StatusBadge from '../../components/StatusBadge';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    keyword: '', activated: '', suspended: '', last_name: 'asc'
  });
  const [actionMsg, setActionMsg] = useState({});
  const limit = 10;

  const load = () => {
    setLoading(true);
    const params = { page, limit, ...filters };
    Object.keys(params).forEach(k => params[k] === '' && delete params[k]);
    listUsers(params)
      .then(r => { setUsers(r.data.results || []); setTotal(r.data.count || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, filters]);

  const setFilter = k => e => setFilters(f => ({ ...f, [k]: e.target.value }));

  const handleSuspend = async (userId, suspended) => {
    try {
      await suspendUser(userId, suspended);
      setActionMsg(m => ({ ...m, [userId]: { type: 'success', text: suspended ? 'User suspended' : 'Suspension removed' } }));
      load();
    } catch (err) {
      setActionMsg(m => ({ ...m, [userId]: { type: 'error', text: err.response?.data?.error || 'Failed' } }));
    }
  };

  return (
    <div className="page">
      <div className="page-header"><h1>Manage Users</h1><p className="page-subtitle">{total} users</p></div>

      <div className="filter-bar">
        <div className="form-group">
          <label>Search</label>
          <input placeholder="Name or email…" value={filters.keyword} onChange={setFilter('keyword')} />
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
          <label>Suspended</label>
          <select value={filters.suspended} onChange={setFilter('suspended')}>
            <option value="">All</option>
            <option value="true">Suspended</option>
            <option value="false">Active</option>
          </select>
        </div>
        <div className="form-group">
          <label>Sort by Name</label>
          <select value={filters.last_name} onChange={setFilter('last_name')}>
            <option value="asc">A → Z</option>
            <option value="desc">Z → A</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading users…</div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Status</th>
                <th>Suspended</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="table-user">
                      <Avatar src={u.avatar} name={`${u.first_name} ${u.last_name}`} size={32} />
                      <span>{u.first_name} {u.last_name}</span>
                    </div>
                  </td>
                  <td>{u.account?.email || u.email}</td>
                  <td>
                    <StatusBadge status={u.account?.activated || u.activated ? 'approved' : 'created'} />
                  </td>
                  <td>
                    {u.suspended ? <StatusBadge status="canceled" /> : <span className="muted">—</span>}
                  </td>
                  <td>
                    {actionMsg[u.id] && (
                      <span className={`small text-${actionMsg[u.id].type}`}>{actionMsg[u.id].text}</span>
                    )}
                    {!u.suspended ? (
                      <button className="btn btn-danger btn-sm" onClick={() => handleSuspend(u.id, true)}>
                        Suspend
                      </button>
                    ) : (
                      <button className="btn btn-success btn-sm" onClick={() => handleSuspend(u.id, false)}>
                        Unsuspend
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
