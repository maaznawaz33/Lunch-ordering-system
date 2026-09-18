import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

const LOGO_URL = 'https://365news.pk/wp-content/uploads/2025/01/channels4_profile-removebg-preview-1.png';

export default function Register() {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const res = await api.post('/auth/register', form);
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-backdrop page">
      <div className="page-narrow">
        <img src={LOGO_URL} alt="Company logo" className="auth-logo" />
        <div className="auth-card">
          <h1>Create an account</h1>
          <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem' }}>Enter your details to get started.</p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Full name</label>
              <input name="fullName" value={form.fullName} onChange={handleChange} required />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required autoComplete="username" />
            </div>
            <div className="field">
              <label>Phone number</label>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} required placeholder="e.g. 03001234567" />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={8} autoComplete="new-password" />
            </div>
            {error && <p className="msg-error">{error}</p>}
            {message && <p className="msg-success">{message}</p>}
            <button type="submit" className="btn btn-block" disabled={submitting}>{submitting ? 'Creating account…' : 'Register'}</button>
          </form>
        </div>
        <p className="auth-foot">Already verified? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  );
}
