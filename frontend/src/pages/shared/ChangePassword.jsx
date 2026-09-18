import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import BrandMark from '../../components/BrandMark';

// Available to both employees and admins (see App.jsx route setup).
// On success the backend clears the session cookies, so we redirect to
// /login after a short delay - the user needs to sign back in with the
// new password.
export default function ChangePassword() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    // Client-side check to catch typos before hitting the server -
    // the backend doesn't need to know about "confirmPassword" at all,
    // it only receives currentPassword/newPassword.
    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setMessage(res.data.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-backdrop page">
      <div className="page-narrow">
        <BrandMark size="lg" />
        <div className="auth-card">
          <h1>Change password</h1>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Current password</label>
              <input
                type="password"
                name="currentPassword"
                value={form.currentPassword}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="field">
              <label>New password</label>
              <input
                type="password"
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="field">
              <label>Confirm new password</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {error && <p className="msg-error">{error}</p>}
            {message && <p className="msg-success">{message}</p>}
            <button type="submit" className="btn btn-block" disabled={submitting}>
              {submitting ? 'Changing…' : 'Change password'}
            </button>
          </form>
        </div>
        <p className="auth-foot">
          <Link to="/">Back to dashboard</Link>
        </p>
      </div>
    </div>
  );
}
