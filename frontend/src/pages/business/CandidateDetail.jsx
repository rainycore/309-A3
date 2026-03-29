// Generated with Claude Code
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCandidate, inviteCandidate } from '../../api/jobs';
import Avatar from '../../components/Avatar';
import { API_BASE } from '../../api/client';

export default function CandidateDetail() {
  const { jobId, userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [inviting, setInviting] = useState(false);

  const load = () => {
    setLoading(true);
    getCandidate(jobId, userId)
      .then(r => setData(r.data))
      .catch(() => setError('Could not load candidate details'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [jobId, userId]);

  const handleInvite = async (interested) => {
    setInviting(true);
    try {
      await inviteCandidate(jobId, userId, interested);
      setMsg(interested ? 'Candidate invited!' : 'Invitation withdrawn');
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Action failed');
    } finally {
      setInviting(false);
    }
  };

  if (loading) return <div className="loading">Loading…</div>;
  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>;
  if (!data) return null;

  const { user, qualification, job } = data;
  const invited = data.invited;

  return (
    <div className="page">
      <button className="btn btn-outline btn-sm back-btn" onClick={() => navigate(`/business/jobs/${jobId}/candidates`)}>← Back to Candidates</button>

      <div className="profile-header">
        <Avatar src={user?.avatar} name={`${user?.first_name} ${user?.last_name}`} size={96} />
        <div className="profile-info">
          <h1>{user?.first_name} {user?.last_name}</h1>
          {user?.email && <p className="meta">{user.email}</p>}
          {user?.phone_number && <p className="meta">📞 {user.phone_number}</p>}
        </div>
        <div className="profile-actions">
          {!invited ? (
            <button className="btn btn-primary" onClick={() => handleInvite(true)} disabled={inviting}>
              Invite to Job
            </button>
          ) : (
            <button className="btn btn-outline" onClick={() => handleInvite(false)} disabled={inviting}>
              Withdraw Invite
            </button>
          )}
        </div>
      </div>

      {msg && <div className="alert alert-info">{msg}</div>}

      {user?.biography && (
        <div className="card">
          <h2>Biography</h2>
          <p>{user.biography}</p>
        </div>
      )}

      {qualification && (
        <div className="card">
          <h2>Qualification for {job?.positionType?.name}</h2>
          <div className="detail-grid">
            <div className="detail-row"><span className="detail-label">Status</span><span>{qualification.status}</span></div>
            {qualification.note && <div className="detail-row"><span className="detail-label">Note</span><span>{qualification.note}</span></div>}
          </div>
          {qualification.document && (
            <a href={`${API_BASE}${qualification.document}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
              📄 View Qualification Document
            </a>
          )}
        </div>
      )}

      {user?.resume && (
        <div className="card">
          <h2>Resume</h2>
          <a href={`${API_BASE}${user.resume}`} target="_blank" rel="noreferrer" className="btn btn-outline">
            📄 View Resume (PDF)
          </a>
        </div>
      )}
    </div>
  );
}
