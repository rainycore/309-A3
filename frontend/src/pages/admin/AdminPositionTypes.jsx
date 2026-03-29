// Generated with Claude Code
import { useState, useEffect } from 'react';
import { listPositionTypes, createPositionType, updatePositionType, deletePositionType } from '../../api/positionTypes';
import Pagination from '../../components/Pagination';
import StatusBadge from '../../components/StatusBadge';

export default function AdminPositionTypes() {
  const [posTypes, setPosTypes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', hidden: false });
  const [editForm, setEditForm] = useState({});
  const [msgs, setMsgs] = useState({});
  const limit = 10;

  const load = () => {
    setLoading(true);
    listPositionTypes({ keyword: search, page, limit, hidden: 'all' })
      .then(r => { setPosTypes(r.data.results || []); setTotal(r.data.count || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, search]);

  const setMsg = (key, type, text) => setMsgs(m => ({ ...m, [key]: { type, text } }));

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createPositionType({ ...form, hidden: form.hidden === true || form.hidden === 'true' });
      setMsg('create', 'success', 'Position type created!');
      setCreating(false);
      setForm({ name: '', description: '', hidden: false });
      load();
    } catch (err) {
      setMsg('create', 'error', err.response?.data?.error || 'Failed');
    }
  };

  const handleUpdate = async (id) => {
    try {
      await updatePositionType(id, editForm);
      setMsg(id, 'success', 'Updated!');
      setEditingId(null);
      load();
    } catch (err) {
      setMsg(id, 'error', err.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this position type?')) return;
    try {
      await deletePositionType(id);
      setMsg(id, 'success', 'Deleted');
      load();
    } catch (err) {
      setMsg(id, 'error', err.response?.data?.error || 'Cannot delete (qualified users exist)');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Position Types</h1>
        <button className="btn btn-primary" onClick={() => setCreating(!creating)}>
          {creating ? 'Cancel' : '+ Create'}
        </button>
      </div>

      {creating && (
        <div className="card">
          <h2>New Position Type</h2>
          {msgs.create && <div className={`alert alert-${msgs.create.type}`}>{msgs.create.text}</div>}
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Description *</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} required />
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" checked={form.hidden} onChange={e => setForm(f => ({ ...f, hidden: e.target.checked }))} />
                {' '}Hidden (not visible to users)
              </label>
            </div>
            <button type="submit" className="btn btn-primary">Create</button>
          </form>
        </div>
      )}

      <form className="search-bar" onSubmit={e => { e.preventDefault(); setSearch(keyword); setPage(1); }}>
        <input placeholder="Search by name…" value={keyword} onChange={e => setKeyword(e.target.value)} />
        <button type="submit" className="btn btn-primary">Search</button>
      </form>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Qualified Users</th>
                <th>Hidden</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posTypes.map(pt => (
                <tr key={pt.id}>
                  <td>
                    {editingId === pt.id ? (
                      <input value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                    ) : pt.name}
                  </td>
                  <td>
                    {editingId === pt.id ? (
                      <textarea value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={2} />
                    ) : <span className="muted small">{pt.description?.slice(0, 60)}{pt.description?.length > 60 ? '…' : ''}</span>}
                  </td>
                  <td>{pt.num_qualified ?? '—'}</td>
                  <td>
                    {editingId === pt.id ? (
                      <input type="checkbox" checked={editForm.hidden || false} onChange={e => setEditForm(f => ({ ...f, hidden: e.target.checked }))} />
                    ) : pt.hidden ? '🙈 Yes' : '👁 No'}
                  </td>
                  <td>
                    {msgs[pt.id] && <div className={`alert alert-${msgs[pt.id].type} small`}>{msgs[pt.id].text}</div>}
                    {editingId !== pt.id ? (
                      <div className="btn-row">
                        <button className="btn btn-outline btn-sm" onClick={() => { setEditingId(pt.id); setEditForm({ name: pt.name, description: pt.description, hidden: pt.hidden }); }}>
                          Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(pt.id)}>
                          Delete
                        </button>
                      </div>
                    ) : (
                      <div className="btn-row">
                        <button className="btn btn-outline btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                        <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(pt.id)}>Save</button>
                      </div>
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
