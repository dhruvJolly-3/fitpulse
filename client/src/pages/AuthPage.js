import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleButton from '../components/GoogleButton';
import AuthHero from '../components/AuthHero';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, googleLogin } = useAuth();

  // Google returns an ID token; the server verifies it and signs us in.
  const onGoogle = async (credential) => {
    setError(''); setLoading(true);
    try { await googleLogin(credential); }
    catch (err) { setError(err.response?.data?.message || 'Google sign-in failed'); }
    finally { setLoading(false); }
  };

  // Parallax: write the pointer position (-1..1 across the window) to CSS
  // variables on the page root, once per frame. Both halves read them.
  const page = useRef(null);
  const frame = useRef(0);
  const onMove = (e) => {
    const { clientX, clientY } = e;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      if (!page.current) return;
      page.current.style.setProperty('--mx', ((clientX / window.innerWidth) * 2 - 1).toFixed(3));
      page.current.style.setProperty('--my', ((clientY / window.innerHeight) * 2 - 1).toFixed(3));
    });
  };

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
    <div className="auth auth-par" ref={page} onMouseMove={onMove}>
      <AuthHero />

      <section className="auth-form">
        {/* Right-side backdrop: smoke drifting in from the hero, soft glows and a heartbeat line */}
        <div className="af-bg" aria-hidden="true">
          <span className="af-smoke" />
          <span className="af-glow g1" />
          <span className="af-glow g2" />
          <svg className="af-pulse" viewBox="0 0 600 120" preserveAspectRatio="none">
            <path d="M0 60 H200 L220 60 L235 25 L250 100 L265 10 L280 80 L292 60 H600" />
          </svg>
        </div>
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

            {mode === 'login' && (
              <div style={{ textAlign: 'right', margin: '-6px 0 14px' }}>
                <Link to="/forgot-password" className="link-btn">Forgot password?</Link>
              </div>
            )}

            {error && <div className="alert">{error}</div>}

            <button type="submit" className="btn primary block" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <GoogleButton onCredential={onGoogle} onError={setError}
            text={mode === 'login' ? 'signin_with' : 'signup_with'} />
        </div>
      </section>
    </div>
  );
}
