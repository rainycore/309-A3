import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listPositionTypes } from '../../api/positionTypes';
import { createQualification, updateQualification, getQualification } from '../../api/qualifications';
import { getMe } from '../../api/users';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';

export default function Qualifications() {
  const [posTypes, setPosTypes] = useState([]);
  const [myQuals, setMyQuals] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [ptTotal, setPtTotal] = useState(0);
  const [ptPage, setPtPage] = useState(1);
  const [ptSearch, setPtSearch] = useState('');
  const [ptKeyword, setPtKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [applying, setApplying] = useState(null);
  const [note, setNote] = useState('');
  const limit = 10;

  const loadPosTypes = () => {
    listPositionTypes({ keyword: ptSearch, page: ptPage, limit })
      .then(r => { setPosTypes(r.data.results || []); setPtTotal(r.data.count || 0); })
      .catch(() => {});
  };

  const loadMyQuals = () => {
    getMe().then(r => {
      const quals = r.data.qualifications || [];
      setMyQuals(quals);
      setTotal(quals.length);
    }).catch(() => {});
  };

  useEffect(() => { loadPosTypes(); }, [ptSearch, ptPage]);
  useEffect(() => { loadMyQuals(); }, []);

  const hasQual = (ptId) => myQuals.find(q => q.positionTypeId === ptId);

  const handleApply = async (ptId) => {
    setError(''); setSuccess('');
    try {
      await createQualification(ptId, note);
      setSuccess('Qualification request created!');
      setApplying(null);
      setNote('');
      loadMyQuals();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create qualification');
    }
  };

  const handleSubmit = async (qualId) => {
    setError(''); setSuccess('');
    try {
      await updateQualification(qualId, { status: 'submitted' });
      setSuccess('Qualification submitted for review!');
      loadMyQuals();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit');
    }
  };

  const handleRevise = async (qualId, newNote) => {
    setError(''); setSuccess('');
    try {
      await updateQualification(qualId, { status: 'revised', note: newNote });
      setSuccess('Qualification revised and resubmitted!');
      loadMyQuals();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to revise');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Qualifications</h1>
        <p className="page-subtitle">Apply for position types and track your qualification status</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="two-col">
        <div>
          <h2>My Qualification Requests</h2>
          {myQuals.length === 0 ? (
            <div className="empty-state">No qualification requests yet. Browse position types to apply.</div>
          ) : (
            <div className="qual-list">
              {myQuals.map(q => (
                <QualCard key={q.id} qual={q} onSubmit={handleSubmit} onRevise={handleRevise} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2>Available Position Types</h2>
          <form className="search-bar small" onSubmit={e => { e.preventDefault(); setPtSearch(ptKeyword); setPtPage(1); }}>
            <input
              placeholder="Search positions…"
              value={ptKeyword}
              onChange={e => setPtKeyword(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
          </form>
          {posTypes.map(pt => {
            const existing = hasQual(pt.id);
            return (
              <div key={pt.id} className="card pos-type-card">
                <div className="pos-type-header">
                  <h3>{pt.name}</h3>
                  {existing && <StatusBadge status={existing.status} />}
                </div>
                <p className="muted">{pt.description}</p>
                {!existing && applying !== pt.id && (
                  <button className="btn btn-primary btn-sm" onClick={() => setApplying(pt.id)}>
                    Apply
                  </button>
                )}
                {applying === pt.id && (
                  <div className="apply-form">
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Add a note (optional)…"
                      rows={3}
                    />
                    <div className="btn-row">
                      <button className="btn btn-outline btn-sm" onClick={() => setApplying(null)}>Cancel</button>
                      <button className="btn btn-primary btn-sm" onClick={() => handleApply(pt.id)}>Submit Application</button>
                    </div>
                  </div>
                )}
                {existing && <p className="muted small">Status: {existing.status} · Updated {new Date(existing.updatedAt).toLocaleDateString()}</p>}
              </div>
            );
          })}
          <Pagination page={ptPage} total={ptTotal} limit={limit} onPage={setPtPage} />
        </div>
      </div>
    </div>
  );
}

function QualCard({ qual, onSubmit, onRevise }) {
  const [expanded, setExpanded] = useState(false);
  const [reviseNote, setReviseNote] = useState(qual.note || '');

  const canSubmit = qual.status === 'created';
  const canRevise = qual.status === 'approved' || qual.status === 'rejected';

  return (
    <div className={`card qual-card status-${qual.status}`}>
      <div className="qual-card-header" onClick={() => setExpanded(!expanded)}>
        <div>
          <strong>{qual.positionType?.name}</strong>
          <StatusBadge status={qual.status} />
        </div>
        <span className="toggle">{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div className="qual-card-body">
          <p className="muted">Updated: {new Date(qual.updatedAt).toLocaleString()}</p>
          {qual.note && <p><strong>Note:</strong> {qual.note}</p>}
          {canSubmit && (
            <button className="btn btn-primary btn-sm" onClick={() => onSubmit(qual.id)}>
              Submit for Review
            </button>
          )}
          {canRevise && (
            <div>
              <textarea
                value={reviseNote}
                onChange={e => setReviseNote(e.target.value)}
                placeholder="Update your note…"
                rows={3}
              />
              <button className="btn btn-primary btn-sm" onClick={() => onRevise(qual.id, reviseNote)}>
                Revise & Resubmit
              </button>
            </div>
          )}
          <Link to="/user/uploads" className="btn btn-outline btn-sm">Upload Document</Link>
        </div>
      )}
    </div>
  );
}
