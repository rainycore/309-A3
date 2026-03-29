// Generated with Claude Code
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getMyNegotiation, decideNegotiation } from '../api/negotiations';
import { useAuth } from '../context/AuthContext';
import CountdownTimer from '../components/CountdownTimer';
import StatusBadge from '../components/StatusBadge';
// date-fns (MIT License) — https://github.com/date-fns/date-fns
import { format } from 'date-fns';
// socket.io-client (MIT License) — https://github.com/socketio/socket.io-client
import { io } from 'socket.io-client';
import { API_BASE } from '../api/client';

export default function Negotiation() {
  const { role } = useAuth();
  const [neg, setNeg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [msg, setMsg] = useState('');
  const [expired, setExpired] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const load = useCallback(() => {
    getMyNegotiation()
      .then(r => { setNeg(r.data); setExpired(false); })
      .catch(err => {
        if (err.response?.status === 404) {
          setError('No active negotiation found.');
        } else {
          setError('Failed to load negotiation');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!neg?.id) return;
    const token = localStorage.getItem('token');
    const socket = io(API_BASE, { auth: { token } });
    socketRef.current = socket;
    socket.emit('join_negotiation', { negotiation_id: neg.id });
    socket.on('chat_message', (data) => {
      setMessages(prev => [...prev, data]);
    });
    return () => socket.disconnect();
  }, [neg?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current) return;
    socketRef.current.emit('chat_message', { negotiation_id: neg.id, message: chatInput.trim() });
    setChatInput('');
  };

  const handleDecision = async (accepted) => {
    setDeciding(true); setMsg('');
    try {
      await decideNegotiation(neg.id, accepted);
      setMsg(accepted ? 'You accepted the negotiation!' : 'You rejected the negotiation.');
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Action failed');
    } finally {
      setDeciding(false);
    }
  };

  const handleExpired = () => {
    setExpired(true);
    setTimeout(load, 2000);
  };

  if (loading) return <div className="loading">Loading negotiation…</div>;

  if (error) {
    return (
      <div className="page">
        <div className="neg-container">
          <div className="alert alert-info">{error}</div>
          <div className="btn-row">
            {role === 'regular' && <Link to="/user/interests" className="btn btn-primary">View Interests</Link>}
            {role === 'business' && <Link to="/business/interests" className="btn btn-primary">View Mutual Interests</Link>}
          </div>
        </div>
      </div>
    );
  }

  if (!neg) return null;

  const isRegular = role === 'regular';
  const myAccepted = isRegular ? neg.candidateAccepted : neg.businessAccepted;
  const theirAccepted = isRegular ? neg.businessAccepted : neg.candidateAccepted;
  const isActive = neg.status === 'active';
  const isCompleted = neg.status === 'completed';
  const isRejected = neg.status === 'rejected';
  const isExpiredStatus = neg.status === 'expired';
  const canDecide = isActive && !myAccepted && !expired;

  const job = neg.job;
  const otherParty = isRegular ? (job?.business?.business_name || 'Business') : (neg.user ? `${neg.user.first_name} ${neg.user.last_name}` : 'Worker');

  return (
    <div className="page">
      <div className="neg-container">
        <div className="neg-header">
          <h1>Negotiation</h1>
          <StatusBadge status={neg.status} />
        </div>

        <div className={`neg-status-bar ${neg.status}`}>
          {isActive && !expired && (
            <div className="neg-timer">
              <span>Time remaining:</span>
              <CountdownTimer expiresAt={neg.expiresAt} onExpire={handleExpired} />
            </div>
          )}
          {(expired || isExpiredStatus) && (
            <div className="alert alert-error">This negotiation has expired.</div>
          )}
          {isCompleted && (
            <div className="alert alert-success">
              🎉 Negotiation completed! The job has been filled. Check your{' '}
              {isRegular ? <Link to="/user/work-history">work history</Link> : <Link to="/business/jobs">job listings</Link>}.
            </div>
          )}
          {isRejected && (
            <div className="alert alert-error">This negotiation was rejected.</div>
          )}
        </div>

        {msg && <div className="alert alert-info">{msg}</div>}

        <div className="neg-parties">
          <div className="neg-party">
            <h3>You</h3>
            <div className={`acceptance-indicator ${myAccepted ? 'accepted' : 'pending'}`}>
              {myAccepted ? '✓ Accepted' : '⏳ Pending'}
            </div>
          </div>
          <div className="neg-vs">↔</div>
          <div className="neg-party">
            <h3>{otherParty}</h3>
            <div className={`acceptance-indicator ${theirAccepted ? 'accepted' : 'pending'}`}>
              {theirAccepted ? '✓ Accepted' : '⏳ Pending'}
            </div>
          </div>
        </div>

        {job && (
          <div className="neg-job-details card">
            <h2>Job Details</h2>
            <div className="detail-grid">
              <div className="detail-row"><span className="detail-label">Position</span><span>{job.positionType?.name}</span></div>
              <div className="detail-row"><span className="detail-label">Business</span><span>{job.business?.business_name}</span></div>
              <div className="detail-row"><span className="detail-label">Salary</span><span>${job.salary_min} – ${job.salary_max}/hr</span></div>
              <div className="detail-row"><span className="detail-label">Start</span><span>{format(new Date(job.start_time), 'PPpp')}</span></div>
              <div className="detail-row"><span className="detail-label">End</span><span>{format(new Date(job.end_time), 'PPpp')}</span></div>
              {job.note && <div className="detail-row"><span className="detail-label">Notes</span><span>{job.note}</span></div>}
            </div>
          </div>
        )}

        {isActive && (
          <div className="neg-actions">
            {canDecide && (
              <>
                <div className="alert alert-warning">
                  <strong>Action Required!</strong> Both parties must accept to confirm this job. Once you accept, you cannot withdraw.
                </div>
                <div className="neg-buttons">
                  <button
                    className="btn btn-success btn-lg"
                    onClick={() => handleDecision(true)}
                    disabled={deciding}
                  >
                    {deciding ? '…' : '✓ Accept Job'}
                  </button>
                  <button
                    className="btn btn-danger btn-lg"
                    onClick={() => handleDecision(false)}
                    disabled={deciding}
                  >
                    {deciding ? '…' : '✗ Reject'}
                  </button>
                </div>
              </>
            )}
            {myAccepted && !theirAccepted && (
              <div className="alert alert-info">
                You have accepted. Waiting for {otherParty} to accept…
              </div>
            )}
          </div>
        )}

        <div className="neg-chat card">
          <h2>Messages</h2>
          <div className="chat-messages">
            {messages.length === 0 && <p className="chat-empty">No messages yet. Say something!</p>}
            {messages.map((m, i) => (
              <div key={i} className={`chat-message ${m.sender_role === role ? 'mine' : 'theirs'}`}>
                <span className="chat-sender">{m.sender_role === role ? 'You' : otherParty}</span>
                <span className="chat-text">{m.message}</span>
                <span className="chat-time">{format(new Date(m.timestamp), 'HH:mm:ss')}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          {isActive && (
            <form className="chat-input-row" onSubmit={sendMessage}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Type a message…"
                disabled={expired}
              />
              <button type="submit" className="btn btn-primary" disabled={!chatInput.trim() || expired}>Send</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
