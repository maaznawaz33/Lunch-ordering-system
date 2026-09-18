import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BrandMark from '../../components/BrandMark';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Controlled form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI feedback state
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      // Send admins to their dashboard, employees to the ordering screen.
      navigate(user.role === 'ADMIN' ? '/admin' : '/');
    } catch (err) {
      // err.response.data.error is the message our backend sends back
      // (e.g. "Invalid email or password.")
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-backdrop page">
      <div className="page-narrow">
        <BrandMark size="lg" />
        <div className="auth-card">
          <h1>Today's lunch</h1>
          <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem' }}>
            Sign in to see the menu and place your order.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="msg-error">{error}</p>}
            <button type="submit" className="btn btn-block" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
        <p className="auth-foot">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
