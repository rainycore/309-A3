// Generated with Claude Code
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listBusinesses } from '../../api/businesses';
import Pagination from '../../components/Pagination';
import Avatar from '../../components/Avatar';
import StatusBadge from '../../components/StatusBadge';

export default function BusinessList() {
  const [businesses, setBusinesses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const limit = 10;

  useEffect(() => {
    setLoading(true);
    listBusinesses({ keyword: search, page, limit })
      .then(r => { setBusinesses(r.data.results || []); setTotal(r.data.count || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(keyword);
    setPage(1);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Businesses</h1>
        <p className="page-subtitle">Browse verified businesses on the platform</p>
      </div>

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search by business name…"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">Search</button>
        {search && <button type="button" className="btn btn-outline" onClick={() => { setSearch(''); setKeyword(''); setPage(1); }}>Clear</button>}
      </form>

      {loading ? (
        <div className="loading">Loading businesses…</div>
      ) : businesses.length === 0 ? (
        <div className="empty-state">
          <p>No businesses found.</p>
        </div>
      ) : (
        <div className="card-grid">
          {businesses.map(b => (
            <Link key={b.id} to={`/businesses/${b.id}`} className="business-card card">
              <div className="business-card-header">
                <Avatar src={b.avatar} name={b.business_name} size={56} />
                <div>
                  <h3>{b.business_name}</h3>
                  <StatusBadge status={b.verified ? 'verified' : 'unverified'} />
                </div>
              </div>
              {b.biography && <p className="card-bio">{b.biography.slice(0, 100)}{b.biography.length > 100 ? '…' : ''}</p>}
              <div className="card-meta">
                {b.postal_address && <span>📍 {b.postal_address}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
      <Pagination page={page} total={total} limit={limit} onPage={setPage} />
    </div>
  );
}
