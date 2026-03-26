import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { path: '/', label: 'Dashboard', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
  { path: '/nutrition', label: 'Nutrition', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2a10 10 0 0 0-7.07 17.07C6.83 21 9.33 22 12 22s5.17-1 7.07-2.93A10 10 0 0 0 12 2z"/><path d="M8 12h8M12 8v8"/></svg> },
  { path: '/training', label: 'Training', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 4v16M18 4v16M2 8h4M18 8h4M2 16h4M18 16h4"/></svg> },
  { path: '/water', label: 'Hydration', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13z"/></svg> },
  { path: '/sleep', label: 'Sleep', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> },
  { path: '/steps', label: 'Activity', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M13 4v6l3 3-3 3v4M11 4v6l-3 3 3 3v4"/></svg> },
];

const MOBILE_NAV = [
  { path: '/', label: 'Home', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
  { path: '/nutrition', label: 'Nutrition', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2a10 10 0 0 0-7.07 17.07C6.83 21 9.33 22 12 22s5.17-1 7.07-2.93A10 10 0 0 0 12 2z"/><path d="M8 12h8M12 8v8"/></svg> },
  { path: '/training', label: 'Train', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 4v16M18 4v16M2 8h4M18 8h4M2 16h4M18 16h4"/></svg> },
  { path: '/water', label: 'Water', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13z"/></svg> },
  { path: '/profile', label: 'Profile', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (path) => path === '/' ? pathname === '/' : pathname.startsWith(path);

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <span className="logo-text">FitPulse</span>
        </div>

        <span className="sidebar-section-label">Core</span>
        {NAV.map(n => (
          <div key={n.path} className={`nav-item ${isActive(n.path) ? 'active' : ''}`} onClick={() => navigate(n.path)}>
            {n.icon}{n.label}
          </div>
        ))}

        <span className="sidebar-section-label">Account</span>
        <div className={`nav-item ${isActive('/profile') ? 'active' : ''}`} onClick={() => navigate('/profile')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          Profile
        </div>

        <div style={{ marginTop: 'auto', padding: '0 24px' }}>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)' }}>
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.83rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'capitalize' }}>{user?.profile?.goal?.replace('_', ' ')}</div>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={logout}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Mobile Nav */}
      <nav className="mobile-nav">
        <div className="mobile-nav-items">
          {MOBILE_NAV.map(n => (
            <div key={n.path} className={`mobile-nav-item ${isActive(n.path) ? 'active' : ''}`} onClick={() => navigate(n.path)}>
              {n.icon}
              <span>{n.label}</span>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}
