import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyBusiness } from '../../api/businesses';
import Avatar from '../../components/Avatar';
import StatusBadge from '../../components/StatusBadge';

export default function BusinessProfilePage() {
  const [biz, setBiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyBusiness()
      .then(r => setBiz(r.data))
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading…</div>;
  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>;
  if (!biz) return null;

  return (
    <div className="page">
      <div className="profile-header">
        <Avatar src={biz.avatar} name={biz.business_name} size={96} />
        <div className="profile-info">
          <h1>{biz.business_name}</h1>
          <div className="profile-badges">
            <StatusBadge status={biz.verified ? 'verified' : 'unverified'} />
            {!biz.verified && <span className="muted small">Pending admin verification before posting jobs</span>}
          </div>
          <p className="meta">{biz.account?.email}</p>
        </div>
        <div className="profile-actions">
          <Link to="/business/edit" className="btn btn-outline">Edit Profile</Link>
          <Link to="/business/avatar" className="btn btn-outline">Change Avatar</Link>
          {biz.verified && <Link to="/business/jobs/new" className="btn btn-primary">+ Post Job</Link>}
        </div>
      </div>

      {!biz.verified && (
        <div className="alert alert-warning">
          Your business is pending verification. An admin must verify your account before you can post jobs.
        </div>
      )}

      {biz.biography && (
        <div className="card">
          <h2>About</h2>
          <p>{biz.biography}</p>
        </div>
      )}

      <div className="card">
        <h2>Business Details</h2>
        <div className="detail-grid">
          <div className="detail-row"><span className="detail-label">Owner</span><span>{biz.owner_name}</span></div>
          <div className="detail-row"><span className="detail-label">Email</span><span>{biz.account?.email}</span></div>
          <div className="detail-row"><span className="detail-label">Phone</span><span>{biz.phone_number}</span></div>
          <div className="detail-row"><span className="detail-label">Address</span><span>{biz.postal_address}</span></div>
          {biz.location_lat != null && (
            <div className="detail-row">
              <span className="detail-label">Coordinates</span>
              <span>{biz.location_lat.toFixed(4)}, {biz.location_lon.toFixed(4)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
