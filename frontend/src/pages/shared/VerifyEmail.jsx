import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../api/client';

const LOGO_URL =
  'https://365news.pk/wp-content/uploads/2025/01/channels4_profile-removebg-preview-1.png';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    if (!token || !email) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }
    api
      .post('/auth/verify-email', { token, email })
      .then((res) => {
        setStatus('success');
        setMessage(res.data.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed.');
      });
  }, [searchParams]);

  return (
    <div className="auth-backdrop page">
      <div className="page-narrow">
        <img src={LOGO_URL} alt="Company logo" className="auth-logo" />
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h1>Email verification</h1>
          {status === 'verifying' && <p style={{ color: 'var(--ink-soft)' }}>Verifying…</p>}
          {status === 'success' && (
            <>
              <p className="msg-success">{message}</p>
              <Link to="/login" className="btn btn-block" style={{ marginTop: '0.5rem' }}>
                Go to login
              </Link>
            </>
          )}
          {status === 'error' && <p className="msg-error">{message}</p>}
        </div>
      </div>
    </div>
  );
}
