import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function Navbar() {
  const { role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname.startsWith(path) ? 'active' : '';

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">StaffLink</Link>
      </div>
      <button className="navbar-toggle" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
      <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
        <Link to="/businesses" className={isActive('/businesses')}>Businesses</Link>

        {!role && (
          <>
            <Link to="/login" className={isActive('/login')}>Login</Link>
            <Link to="/register" className={isActive('/register')}>Register</Link>
          </>
        )}

        {role === 'regular' && (
          <>
            <Link to="/jobs" className={isActive('/jobs')}>Find Jobs</Link>
            <Link to="/user/qualifications" className={isActive('/user/qualifications')}>Qualifications</Link>
            <Link to="/user/interests" className={isActive('/user/interests')}>Interests</Link>
            <Link to="/user/invitations" className={isActive('/user/invitations')}>Invitations</Link>
            <Link to="/user/work-history" className={isActive('/user/work-history')}>Work History</Link>
            <Link to="/user/profile" className={isActive('/user/profile')}>Profile</Link>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </>
        )}

        {role === 'business' && (
          <>
            <Link to="/business/jobs" className={isActive('/business/jobs')}>My Jobs</Link>
            <Link to="/business/interests" className={isActive('/business/interests')}>Mutual Interests</Link>
            <Link to="/business/profile" className={isActive('/business/profile')}>Profile</Link>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </>
        )}

        {role === 'admin' && (
          <>
            <Link to="/admin/users" className={isActive('/admin/users')}>Users</Link>
            <Link to="/admin/businesses" className={isActive('/admin/businesses')}>Businesses</Link>
            <Link to="/admin/position-types" className={isActive('/admin/position-types')}>Positions</Link>
            <Link to="/admin/qualifications" className={isActive('/admin/qualifications')}>Qualifications</Link>
            <Link to="/admin/system" className={isActive('/admin/system')}>System</Link>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}
