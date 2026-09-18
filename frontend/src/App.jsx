import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/shared/Login';
import Register from './pages/shared/Register';
import VerifyEmail from './pages/shared/VerifyEmail';
import ChangePassword from './pages/shared/ChangePassword';
import EmployeeDashboard from './pages/employee/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';

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
