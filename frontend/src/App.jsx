// Generated with Claude Code
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

// Auth
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Activate from './pages/auth/Activate';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Public
import Landing from './pages/public/Landing';
import BusinessList from './pages/public/BusinessList';
import BusinessProfile from './pages/public/BusinessProfile';

// User
import UserProfile from './pages/user/UserProfile';
import EditProfile from './pages/user/EditProfile';
import Uploads from './pages/user/Uploads';
import Qualifications from './pages/user/Qualifications';
import JobListings from './pages/user/JobListings';
import JobDetail from './pages/user/JobDetail';
import Invitations from './pages/user/Invitations';
import Interests from './pages/user/Interests';
import WorkHistory from './pages/user/WorkHistory';

// Business
import BusinessProfilePage from './pages/business/BusinessProfilePage';
import EditBusinessProfile from './pages/business/EditBusinessProfile';
import CreateJob from './pages/business/CreateJob';
import BusinessJobs from './pages/business/BusinessJobs';
import BusinessJobDetail from './pages/business/BusinessJobDetail';
import Candidates from './pages/business/Candidates';
import CandidateDetail from './pages/business/CandidateDetail';
import BusinessInterests from './pages/business/BusinessInterests';

// Admin
import AdminUsers from './pages/admin/AdminUsers';
import AdminBusinesses from './pages/admin/AdminBusinesses';
import AdminPositionTypes from './pages/admin/AdminPositionTypes';
import AdminQualifications from './pages/admin/AdminQualifications';
import QualificationReview from './pages/admin/QualificationReview';
import AdminSystem from './pages/admin/AdminSystem';

// Negotiation
import Negotiation from './pages/Negotiation';

export default function App() {
  return (
    <AuthProvider>
      <Navbar />
      <main className="main-content">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/businesses" element={<BusinessList />} />
          <Route path="/businesses/:id" element={<BusinessProfile />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/activate" element={<Activate />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Regular User */}
          <Route path="/user/profile" element={<PrivateRoute roles={['regular']}><UserProfile /></PrivateRoute>} />
          <Route path="/user/edit" element={<PrivateRoute roles={['regular']}><EditProfile /></PrivateRoute>} />
          <Route path="/user/uploads" element={<PrivateRoute roles={['regular']}><Uploads /></PrivateRoute>} />
          <Route path="/user/qualifications" element={<PrivateRoute roles={['regular']}><Qualifications /></PrivateRoute>} />
          <Route path="/jobs" element={<PrivateRoute roles={['regular']}><JobListings /></PrivateRoute>} />
          <Route path="/jobs/:id" element={<PrivateRoute roles={['regular']}><JobDetail /></PrivateRoute>} />
          <Route path="/user/invitations" element={<PrivateRoute roles={['regular']}><Invitations /></PrivateRoute>} />
          <Route path="/user/interests" element={<PrivateRoute roles={['regular']}><Interests /></PrivateRoute>} />
          <Route path="/user/work-history" element={<PrivateRoute roles={['regular']}><WorkHistory /></PrivateRoute>} />

          {/* Business */}
          <Route path="/business/profile" element={<PrivateRoute roles={['business']}><BusinessProfilePage /></PrivateRoute>} />
          <Route path="/business/edit" element={<PrivateRoute roles={['business']}><EditBusinessProfile /></PrivateRoute>} />
          <Route path="/business/avatar" element={<PrivateRoute roles={['business']}><EditBusinessProfile /></PrivateRoute>} />
          <Route path="/business/jobs/new" element={<PrivateRoute roles={['business']}><CreateJob /></PrivateRoute>} />
          <Route path="/business/jobs" element={<PrivateRoute roles={['business']}><BusinessJobs /></PrivateRoute>} />
          <Route path="/business/jobs/:id" element={<PrivateRoute roles={['business']}><BusinessJobDetail /></PrivateRoute>} />
          <Route path="/business/jobs/:jobId/candidates" element={<PrivateRoute roles={['business']}><Candidates /></PrivateRoute>} />
          <Route path="/business/jobs/:jobId/candidates/:userId" element={<PrivateRoute roles={['business']}><CandidateDetail /></PrivateRoute>} />
          <Route path="/business/interests" element={<PrivateRoute roles={['business']}><BusinessInterests /></PrivateRoute>} />

          {/* Admin */}
          <Route path="/admin/users" element={<PrivateRoute roles={['admin']}><AdminUsers /></PrivateRoute>} />
          <Route path="/admin/businesses" element={<PrivateRoute roles={['admin']}><AdminBusinesses /></PrivateRoute>} />
          <Route path="/admin/position-types" element={<PrivateRoute roles={['admin']}><AdminPositionTypes /></PrivateRoute>} />
          <Route path="/admin/qualifications" element={<PrivateRoute roles={['admin']}><AdminQualifications /></PrivateRoute>} />
          <Route path="/admin/qualifications/:id" element={<PrivateRoute roles={['admin']}><QualificationReview /></PrivateRoute>} />
          <Route path="/admin/system" element={<PrivateRoute roles={['admin']}><AdminSystem /></PrivateRoute>} />

          {/* Negotiation */}
          <Route path="/negotiation" element={<PrivateRoute roles={['regular', 'business']}><Negotiation /></PrivateRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}
