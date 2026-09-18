import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const LOGO_URL =
  'https://365news.pk/wp-content/uploads/2025/01/channels4_profile-removebg-preview-1.png';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'ADMIN' ? '/admin' : '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-backdrop page">
      <div className="page-narrow">
        <img src={LOGO_URL} alt="Company logo" className="auth-logo" />
        <div className="auth-card">
          <h1>Today's lunch</h1>
          <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem' }}>
            Sign in to see the menu and place your order.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
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
