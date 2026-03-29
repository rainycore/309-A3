// Generated with Claude Code
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getBusiness } from '../../api/businesses';
import Avatar from '../../components/Avatar';
import StatusBadge from '../../components/StatusBadge';

export default function BusinessProfile() {
  const { id } = useParams();
  const [biz, setBiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getBusiness(id)
      .then(r => setBiz(r.data))
      .catch(() => setError('Business not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Loading…</div>;
  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>;

  return (
    <div className="page">
      <div className="profile-header">
        <Avatar src={biz.avatar} name={biz.business_name} size={96} />
        <div className="profile-info">
          <h1>{biz.business_name}</h1>
          <StatusBadge status={biz.verified ? 'verified' : 'unverified'} />
          {biz.postal_address && <p className="meta">📍 {biz.postal_address}</p>}
        </div>
      </div>

      {biz.biography && (
        <div className="card">
          <h2>About</h2>
          <p>{biz.biography}</p>
        </div>
      )}

      <div className="card">
        <h2>Contact</h2>
        <div className="detail-grid">
          {biz.phone_number && <div className="detail-row"><span className="detail-label">Phone</span><span>{biz.phone_number}</span></div>}
          {biz.postal_address && <div className="detail-row"><span className="detail-label">Address</span><span>{biz.postal_address}</span></div>}
          {biz.location_lat != null && (
            <div className="detail-row">
              <span className="detail-label">Location</span>
              <span>{biz.location_lat.toFixed(4)}, {biz.location_lon.toFixed(4)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
