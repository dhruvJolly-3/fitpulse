import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      {/* Background glow */}
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(181,242,61,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, background: 'var(--accent)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em' }}>FitPulse</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: 6 }}>Your intelligent fitness companion</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px 28px' }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-raised)', borderRadius: 'var(--r-md)', padding: 4, marginBottom: 28 }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                style={{ flex: 1, padding: '8px', borderRadius: 'calc(var(--r-md) - 2px)', background: mode === m ? 'var(--bg-card)' : 'transparent', color: mode === m ? 'var(--text)' : 'var(--text-3)', fontWeight: 600, fontSize: '0.85rem', border: mode === m ? '1px solid var(--border)' : 'none', transition: 'all 0.15s', cursor: 'pointer' }}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={submit}>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input placeholder="Alex Johnson" value={form.name} onChange={set('name')} required />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required minLength={6} />
            </div>

            {error && (
              <div style={{ background: 'rgba(255,87,87,0.1)', border: '1px solid rgba(255,87,87,0.3)', borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: '0.83rem', color: 'var(--red)', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '13px' }} disabled={loading}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 20 }}>
          Track nutrition · Train smarter · Sleep better
        </p>
      </div>
    </div>
  );
}
