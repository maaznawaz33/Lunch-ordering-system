import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Wrap any <Route> element with this to require login (and optionally a
// specific role). See App.jsx for how each route uses it.
//
// Note: this is a UX convenience only, not real security - the backend
// enforces access control on every request regardless of what this
// component shows or hides (see backend/src/middleware/auth.js).
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
