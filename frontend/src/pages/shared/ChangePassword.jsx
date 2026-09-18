import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';

const LOGO_URL =
  'https://365news.pk/wp-content/uploads/2025/01/channels4_profile-removebg-preview-1.png';

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
        <img src={LOGO_URL} alt="Company logo" className="auth-logo" />
        <div className="auth-card">
          <h1>Change password</h1>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Current password</label>
              <input type="password" name="currentPassword" value={form.currentPassword} onChange={handleChange} required autoComplete="current-password" />
            </div>
            <div className="field">
              <label>New password</label>
              <input type="password" name="newPassword" value={form.newPassword} onChange={handleChange} required minLength={8} autoComplete="new-password" />
            </div>
            <div className="field">
              <label>Confirm new password</label>
              <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required minLength={8} autoComplete="new-password" />
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
