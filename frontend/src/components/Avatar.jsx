import { API_BASE } from '../api/client';

export default function Avatar({ src, name, size = 48 }) {
  if (src) {
    return (
      <img
        src={`${API_BASE}${src}`}
        alt={name}
        className="avatar"
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    );
  }
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  return (
    <div
      className="avatar avatar-placeholder"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}
