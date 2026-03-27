import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listPendingQualifications } from '../../api/qualifications';
import Pagination from '../../components/Pagination';
import StatusBadge from '../../components/StatusBadge';

export default function AdminQualifications() {
  const [quals, setQuals] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const limit = 10;

  const load = () => {
    setLoading(true);
    listPendingQualifications({ keyword: search, page, limit })
      .then(r => { setQuals(r.data.results || []); setTotal(r.data.count || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, search]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Pending Qualifications</h1>
        <p className="page-subtitle">{total} awaiting review</p>
      </div>

      <form className="search-bar" onSubmit={e => { e.preventDefault(); setSearch(keyword); setPage(1); }}>
        <input placeholder="Search…" value={keyword} onChange={e => setKeyword(e.target.value)} />
        <button type="submit" className="btn btn-primary">Search</button>
      </form>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : quals.length === 0 ? (
        <div className="empty-state">No pending qualifications to review.</div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Position Type</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quals.map(q => (
                <tr key={q.id}>
                  <td>{q.user?.first_name} {q.user?.last_name}</td>
                  <td>{q.positionType?.name}</td>
                  <td><StatusBadge status={q.status} /></td>
                  <td>{new Date(q.updatedAt).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/admin/qualifications/${q.id}`} className="btn btn-primary btn-sm">Review</Link>
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
