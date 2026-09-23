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
    <div className="auth">
      <section className="auth-hero">
        <div className="brand">
          <div className="brand-mark">F</div>
          <span className="brand-name">FitPulse<b>.</b></span>
        </div>
        <div>
          <h1>train. eat.<br />sleep. <span className="serif-it">repeat.</span></h1>
          <p>Nutrition, training, hydration, sleep and steps — tracked in one place, against targets built from your own body stats.</p>
        </div>
        <span className="label" style={{ color: 'var(--cream-34)' }}>Track nutrition · Train smarter · Sleep better</span>
      </section>

      <section className="auth-form">
        <div className="inner fade-up">
          <div className="seg">
            {['login', 'register'].map(m => (
              <button key={m} type="button" className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>
                {m === 'login' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          <h2>{mode === 'login' ? <>welcome <span className="serif-it">back</span></> : <>start <span className="serif-it">today</span></>}</h2>

          <form onSubmit={submit}>
            {mode === 'register' && (
              <div className="field">
                <label>Full name</label>
                <input placeholder="Alex Johnson" value={form.name} onChange={set('name')} required />
              </div>
            )}
            <div className="field">
              <label>Email</label>
              <input type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required minLength={6} />
            </div>

            {error && <div className="alert">{error}</div>}

            <button type="submit" className="btn primary block" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
