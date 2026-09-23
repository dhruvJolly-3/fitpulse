import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { path: '/', label: 'Dashboard', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
  { path: '/nutrition', label: 'Nutrition', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 0 0-7.07 17.07C6.83 21 9.33 22 12 22s5.17-1 7.07-2.93A10 10 0 0 0 12 2z"/><path d="M8 12h8M12 8v8"/></svg> },
  { path: '/training', label: 'Training', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 4v16M18 4v16M2 8h4M18 8h4M2 16h4M18 16h4"/></svg> },
  { path: '/water', label: 'Hydration', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13z"/></svg> },
  { path: '/sleep', label: 'Sleep', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> },
  { path: '/steps', label: 'Activity', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 4v6l3 3-3 3v4M11 4v6l-3 3 3 3v4"/></svg> },
];

const MOBILE_NAV = [
  { path: '/', label: 'Home', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
  { path: '/nutrition', label: 'Nutrition', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 0 0-7.07 17.07C6.83 21 9.33 22 12 22s5.17-1 7.07-2.93A10 10 0 0 0 12 2z"/><path d="M8 12h8M12 8v8"/></svg> },
  { path: '/training', label: 'Train', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 4v16M18 4v16M2 8h4M18 8h4M2 16h4M18 16h4"/></svg> },
  { path: '/water', label: 'Water', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13z"/></svg> },
  { path: '/profile', label: 'Profile', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (path) => path === '/' ? pathname === '/' : pathname.startsWith(path);

  return (
    <div className="app-shell">
      {/* Sidebar rail */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">F</div>
          <span className="brand-name">FitPulse<b>.</b></span>
        </div>

        <span className="nav-label">Core</span>
        <nav className="nav">
          {NAV.map(n => (
            <button key={n.path} className={`nav-item ${isActive(n.path) ? 'active' : ''}`} onClick={() => navigate(n.path)} title={n.label}>
              {n.icon}<span className="lbl">{n.label}</span>
            </button>
          ))}
        </nav>

        <span className="nav-label">Account</span>
        <nav className="nav">
          <button className={`nav-item ${isActive('/profile') ? 'active' : ''}`} onClick={() => navigate('/profile')} title="Profile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            <span className="lbl">Profile</span>
          </button>
        </nav>

        <div className="rail-foot">
          <div className="rail-profile">
            <div className="avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div className="meta">
              <div className="nm">{user?.name}</div>
              <div className="em">{user?.profile?.goal?.replace('_', ' ')}</div>
            </div>
          </div>
          <button className="signout" onClick={logout} title="Sign out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            <span className="lbl">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Mobile tab bar */}
      <nav className="mobile-nav">
        {MOBILE_NAV.map(n => (
          <button key={n.path} className={`mobile-nav-item ${isActive(n.path) ? 'active' : ''}`} onClick={() => navigate(n.path)}>
            {n.icon}
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
