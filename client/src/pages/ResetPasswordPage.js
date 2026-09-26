import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';

// Step 2 of password reset: opened from the emailed link
// (/reset-password?token=...). On success the user is signed in.
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setError(''); setLoading(true);
    try {
      await resetPassword(token, form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout>
        <h2>link <span className="serif-it">missing</span></h2>
        <div className="alert">This reset link is incomplete. Request a new one.</div>
        <Link to="/forgot-password" className="btn primary block">Request new link</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h2>new <span className="serif-it">password</span></h2>
      <form onSubmit={submit}>
        <div className="field">
          <label>New password</label>
          <input type="password" placeholder="••••••••" minLength={6} required autoFocus
            value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
        </div>
        <div className="field">
          <label>Confirm password</label>
          <input type="password" placeholder="••••••••" minLength={6} required
            value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))} />
        </div>
        {error && <div className="alert">{error}</div>}
        <button type="submit" className="btn primary block" disabled={loading}>
          {loading ? 'Saving…' : 'Set password & sign in'}
        </button>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/forgot-password" className="link-btn">Link expired? Request a new one</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
