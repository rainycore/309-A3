// Generated with Claude Code
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMe, setAvailability } from '../../api/users';
import Avatar from '../../components/Avatar';
import StatusBadge from '../../components/StatusBadge';
import { API_BASE } from '../../api/client';

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [availLoading, setAvailLoading] = useState(false);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    getMe()
      .then(r => setUser(r.data))
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleAvailability = async () => {
    setAvailLoading(true);
    try {
      await setAvailability(!user.available);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Cannot change availability');
    } finally {
      setAvailLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading profile…</div>;
  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>;
  if (!user) return null;

  const approvedQuals = user.qualifications?.filter(q => q.status === 'approved') || [];
  const canBeAvailable = approvedQuals.length > 0 && !user.suspended;

  return (
    <div className="page">
      <div className="profile-header">
        <Avatar src={user.avatar} name={`${user.first_name} ${user.last_name}`} size={96} />
        <div className="profile-info">
          <h1>{user.first_name} {user.last_name}</h1>
          <div className="profile-badges">
            {user.suspended
              ? <StatusBadge status="canceled" />
              : <StatusBadge status={user.available ? 'open' : 'created'} />
            }
            {user.suspended && <span className="badge badge-danger">Suspended</span>}
          </div>
          <p className="meta">{user.account?.email}</p>
        </div>
        <div className="profile-actions">
          <Link to="/user/edit" className="btn btn-outline">Edit Profile</Link>
          <Link to="/user/uploads" className="btn btn-outline">Manage Files</Link>
          {!user.suspended && (
            <button
              className={`btn ${user.available ? 'btn-warning' : 'btn-success'}`}
              onClick={toggleAvailability}
              disabled={availLoading || !canBeAvailable}
              title={!canBeAvailable ? 'You need at least one approved qualification to be available' : ''}
            >
              {availLoading ? '…' : user.available ? 'Set Unavailable' : 'Set Available'}
            </button>
          )}
        </div>
      </div>

      {!canBeAvailable && !user.suspended && (
        <div className="alert alert-info">
          You need at least one approved qualification to set yourself as available.{' '}
          <Link to="/user/qualifications">View Qualifications</Link>
        </div>
      )}

      {user.biography && (
        <div className="card">
          <h2>About Me</h2>
          <p>{user.biography}</p>
        </div>
      )}

      <div className="card">
        <h2>Personal Information</h2>
        <div className="detail-grid">
          <div className="detail-row"><span className="detail-label">Email</span><span>{user.account?.email}</span></div>
          {user.phone_number && <div className="detail-row"><span className="detail-label">Phone</span><span>{user.phone_number}</span></div>}
          {user.postal_address && <div className="detail-row"><span className="detail-label">Address</span><span>{user.postal_address}</span></div>}
          {user.birthday && <div className="detail-row"><span className="detail-label">Birthday</span><span>{user.birthday}</span></div>}
          <div className="detail-row"><span className="detail-label">Last Active</span><span>{new Date(user.lastActiveAt).toLocaleString()}</span></div>
        </div>
      </div>

      {user.resume && (
        <div className="card">
          <h2>Resume</h2>
          <a href={`${API_BASE}${user.resume}`} target="_blank" rel="noreferrer" className="btn btn-outline">
            📄 View Resume (PDF)
          </a>
        </div>
      )}

      <div className="card">
        <h2>Approved Qualifications</h2>
        {approvedQuals.length === 0 ? (
          <p className="muted">No approved qualifications yet. <Link to="/user/qualifications">Apply for qualifications</Link></p>
        ) : (
          <div className="qual-list">
            {approvedQuals.map(q => (
              <div key={q.id} className="qual-item">
                <span className="qual-name">{q.positionType?.name}</span>
                <StatusBadge status={q.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
