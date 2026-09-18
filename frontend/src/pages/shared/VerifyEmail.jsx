import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../api/client';
import BrandMark from '../../components/BrandMark';

// Landing page for the link sent in the verification email
// (backend/src/utils/email.js builds a URL like:
//   https://yourdomain.com/verify-email?token=...&email=...
// and this page reads those two values straight out of the URL).
export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
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
    // Only re-run if the URL's query params change (they won't in practice,
    // but this satisfies the exhaustive-deps lint rule correctly).
  }, [searchParams]);

  return (
    <div className="auth-backdrop page">
      <div className="page-narrow">
        <BrandMark size="lg" />
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
