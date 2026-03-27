import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Landing() {
  const { role } = useAuth();

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-content">
          <h1>StaffLink</h1>
          <p className="hero-tagline">The intelligent temporary staffing platform connecting qualified workers with businesses that need them — fast.</p>
          <div className="hero-actions">
            {!role && (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">Get Started</Link>
                <Link to="/login" className="btn btn-outline btn-lg">Sign In</Link>
              </>
            )}
            {role === 'regular' && <Link to="/jobs" className="btn btn-primary btn-lg">Browse Jobs</Link>}
            {role === 'business' && <Link to="/business/jobs" className="btn btn-primary btn-lg">Manage Jobs</Link>}
            {role === 'admin' && <Link to="/admin/users" className="btn btn-primary btn-lg">Admin Panel</Link>}
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-card">
            <div className="hero-stat"><span className="stat-num">20+</span><span className="stat-label">Qualified Workers</span></div>
            <div className="hero-stat"><span className="stat-num">10+</span><span className="stat-label">Businesses</span></div>
            <div className="hero-stat"><span className="stat-num">30+</span><span className="stat-label">Job Postings</span></div>
          </div>
        </div>
      </section>

      <section className="features">
        <h2>How It Works</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">👤</div>
            <h3>For Job Seekers</h3>
            <p>Create a profile, get qualified for position types, and browse available jobs that match your skills and location.</p>
            <Link to="/register" className="btn btn-outline">Register as Worker</Link>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🏢</div>
            <h3>For Businesses</h3>
            <p>Post temporary job openings, browse qualified candidates, and fill positions quickly through our matching system.</p>
            <Link to="/register" className="btn btn-outline">Register as Business</Link>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🤝</div>
            <h3>Mutual Matching</h3>
            <p>Both workers and businesses express interest. When it's mutual, negotiate terms and confirm the placement — all in real time.</p>
            <Link to="/businesses" className="btn btn-outline">View Businesses</Link>
          </div>
        </div>
      </section>

      <section className="how-steps">
        <h2>The Process</h2>
        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <h4>Get Qualified</h4>
            <p>Submit qualification documents for position types. Admins review and approve them.</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-num">2</div>
            <h4>Show Interest</h4>
            <p>Browse open jobs and express interest. Businesses browse qualified candidates and invite them.</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-num">3</div>
            <h4>Negotiate</h4>
            <p>When both sides are interested, start a timed negotiation session and accept the terms.</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step">
            <div className="step-num">4</div>
            <h4>Work!</h4>
            <p>The job is confirmed. Show up, complete the work, and build your track record.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
