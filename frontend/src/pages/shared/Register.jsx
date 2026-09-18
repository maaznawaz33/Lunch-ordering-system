import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import BrandMark from '../../components/BrandMark';

// Self-registration form for employees.
// Note: the backend enforces the actual rules (email domain restriction
// if enabled, password length, required fields) - this form just collects
// the values and shows whatever error the backend sends back.
export default function Register() {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Generic change handler - works for every field since they all share
  // the "name" attribute matching a key in the form state object.
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const res = await api.post('/auth/register', form);
      // On success the backend sends a message like "check your email to
      // verify your account" - it does NOT log the user in immediately.
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
        <BrandMark size="lg" />
        <div className="auth-card">
          <h1>Create an account</h1>
          <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem' }}>
            Enter your details to get started.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Full name</label>
              <input name="fullName" value={form.fullName} onChange={handleChange} required />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="username"
              />
            </div>
            <div className="field">
              <label>Phone number</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                placeholder="e.g. 03001234567"
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {error && <p className="msg-error">{error}</p>}
            {message && <p className="msg-success">{message}</p>}
            <button type="submit" className="btn btn-block" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Register'}
            </button>
          </form>
        </div>
        <p className="auth-foot">
          Already verified? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
