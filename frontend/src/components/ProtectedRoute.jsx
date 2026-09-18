import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Note: this is a UX convenience only. The backend enforces RBAC on every
// request regardless of what the frontend shows or hides.
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
