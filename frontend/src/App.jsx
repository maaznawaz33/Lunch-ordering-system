import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/shared/Login';
import Register from './pages/shared/Register';
import VerifyEmail from './pages/shared/VerifyEmail';
import ChangePassword from './pages/shared/ChangePassword';
import EmployeeDashboard from './pages/employee/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';

// Top-level route map for the whole app.
//
//   /login            - anyone
//   /register          - anyone
//   /verify-email       - anyone (link from the verification email)
//   /change-password    - any logged-in user (employee or admin)
//   /                  - employees' ordering screen (also reachable by admins)
//   /admin              - admin-only dashboard
//
// ProtectedRoute checks AuthContext and redirects to /login if there's no
// session, or back to / if the user's role isn't in allowedRoles.
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute allowedRoles={['EMPLOYEE', 'ADMIN']}>
                <ChangePassword />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={['EMPLOYEE', 'ADMIN']}>
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
