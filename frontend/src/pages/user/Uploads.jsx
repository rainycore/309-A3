import { useState, useEffect } from 'react';
import { getMe } from '../../api/users';
import { uploadAvatar, uploadResume } from '../../api/users';
import { uploadQualificationDocument } from '../../api/qualifications';
import Avatar from '../../components/Avatar';
import { API_BASE } from '../../api/client';

export default function Uploads() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [avatarFile, setAvatarFile] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [docFile, setDocFile] = useState(null);
  const [selectedQual, setSelectedQual] = useState('');
  const [uploading, setUploading] = useState({});
  const [msgs, setMsgs] = useState({});

  const load = () => {
    setLoading(true);
    getMe().then(r => setUser(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const setMsg = (key, type, text) => setMsgs(m => ({ ...m, [key]: { type, text } }));

  const handleAvatarUpload = async (e) => {
    e.preventDefault();
    if (!avatarFile) return;
    setUploading(u => ({ ...u, avatar: true }));
    try {
      await uploadAvatar(avatarFile);
      setMsg('avatar', 'success', 'Avatar updated!');
      load();
    } catch (err) {
      setMsg('avatar', 'error', err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(u => ({ ...u, avatar: false }));
    }
  };

  const handleResumeUpload = async (e) => {
    e.preventDefault();
    if (!resumeFile) return;
    setUploading(u => ({ ...u, resume: true }));
    try {
      await uploadResume(resumeFile);
      setMsg('resume', 'success', 'Resume updated!');
      load();
    } catch (err) {
      setMsg('resume', 'error', err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(u => ({ ...u, resume: false }));
    }
  };

  const handleDocUpload = async (e) => {
    e.preventDefault();
    if (!docFile || !selectedQual) return;
    setUploading(u => ({ ...u, doc: true }));
    try {
      await uploadQualificationDocument(selectedQual, docFile);
      setMsg('doc', 'success', 'Document uploaded!');
      load();
    } catch (err) {
      setMsg('doc', 'error', err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(u => ({ ...u, doc: false }));
    }
  };

  if (loading) return <div className="loading">Loading…</div>;
  if (!user) return null;

  const quals = user.qualifications || [];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Manage Files</h1>
      </div>

      <div className="card">
        <h2>Profile Avatar</h2>
        <div className="upload-section">
          <Avatar src={user.avatar} name={`${user.first_name} ${user.last_name}`} size={80} />
          <form onSubmit={handleAvatarUpload} className="upload-form">
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={e => setAvatarFile(e.target.files[0])}
            />
            <p className="hint">PNG or JPEG, max 5MB</p>
            <button type="submit" className="btn btn-primary" disabled={!avatarFile || uploading.avatar}>
              {uploading.avatar ? 'Uploading…' : 'Upload Avatar'}
            </button>
          </form>
        </div>
        {msgs.avatar && <div className={`alert alert-${msgs.avatar.type}`}>{msgs.avatar.text}</div>}
      </div>

      <div className="card">
        <h2>Resume</h2>
        <div className="upload-section">
          {user.resume && (
            <a href={`${API_BASE}${user.resume}`} target="_blank" rel="noreferrer" className="btn btn-outline">
              📄 View Current Resume
            </a>
          )}
          <form onSubmit={handleResumeUpload} className="upload-form">
            <input
              type="file"
              accept="application/pdf"
              onChange={e => setResumeFile(e.target.files[0])}
            />
            <p className="hint">PDF only, max 10MB</p>
            <button type="submit" className="btn btn-primary" disabled={!resumeFile || uploading.resume}>
              {uploading.resume ? 'Uploading…' : 'Upload Resume'}
            </button>
          </form>
        </div>
        {msgs.resume && <div className={`alert alert-${msgs.resume.type}`}>{msgs.resume.text}</div>}
      </div>

      <div className="card">
        <h2>Qualification Documents</h2>
        {quals.length === 0 ? (
          <p className="muted">No qualifications yet. Create one first.</p>
        ) : (
          <form onSubmit={handleDocUpload} className="upload-form">
            <div className="form-group">
              <label>Select Qualification</label>
              <select value={selectedQual} onChange={e => setSelectedQual(e.target.value)} required>
                <option value="">Choose qualification…</option>
                {quals.map(q => (
                  <option key={q.id} value={q.id}>
                    {q.positionType?.name} ({q.status}){q.document ? ' — has document' : ''}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="file"
              accept="application/pdf"
              onChange={e => setDocFile(e.target.files[0])}
            />
            <p className="hint">PDF only, max 10MB</p>
            {selectedQual && quals.find(q => q.id === parseInt(selectedQual))?.document && (
              <a
                href={`${API_BASE}${quals.find(q => q.id === parseInt(selectedQual)).document}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline"
              >📄 View Current Document</a>
            )}
            <button type="submit" className="btn btn-primary" disabled={!docFile || !selectedQual || uploading.doc}>
              {uploading.doc ? 'Uploading…' : 'Upload Document'}
            </button>
          </form>
        )}
        {msgs.doc && <div className={`alert alert-${msgs.doc.type}`}>{msgs.doc.text}</div>}
      </div>
    </div>
  );
}
