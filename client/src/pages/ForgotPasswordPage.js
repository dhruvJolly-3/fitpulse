import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';

// Step 1 of password reset: ask for the email and trigger the reset email.
// The server replies the same way whether or not the account exists.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setSent(data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <AuthLayout>
      <h2>reset <span className="serif-it">password</span></h2>
      {sent ? (
        <>
          <div className="notice">{sent} Check your inbox (and spam folder).</div>
          <Link to="/auth" className="btn ghost block">Back to sign in</Link>
        </>
      ) : (
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          {error && <div className="alert">{error}</div>}
          <button type="submit" className="btn primary block" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Link to="/auth" className="link-btn">Back to sign in</Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
