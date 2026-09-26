import React from 'react';

// Shared two-column layout (obsidian hero + form) for the auth-adjacent
// pages: forgot password and reset password. AuthPage has its own copy of
// the hero because it also switches between sign-in and sign-up.
export default function AuthLayout({ children }) {
  return (
    <div className="auth">
      <section className="auth-hero">
        <div className="brand">
          <div className="brand-mark">F</div>
          <span className="brand-name">FitPulse<b>.</b></span>
        </div>
        <div>
          <h1>locked <span className="serif-it">out?</span></h1>
          <p>It happens. We'll email you a secure link to set a new password — it expires after one hour.</p>
        </div>
        <span className="label" style={{ color: 'var(--cream-34)' }}>Track nutrition · Train smarter · Sleep better</span>
      </section>
      <section className="auth-form">
        <div className="inner fade-up">{children}</div>
      </section>
    </div>
  );
}
