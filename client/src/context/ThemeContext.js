import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Light / dark / system theme. The choice is kept per browser in
// localStorage ('fp_theme'); "system" follows the phone/computer setting.
// public/index.html applies the saved theme before React loads, so there's
// no flash of the wrong theme.
const KEY = 'fp_theme';
const ThemeContext = createContext({ theme: 'system', resolved: 'light', setTheme: () => {}, toggle: () => {} });
export const useTheme = () => useContext(ThemeContext);

const systemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches;
const read = () => { try { return localStorage.getItem(KEY) || 'system'; } catch { return 'system'; } };

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(read);
  const [sysDark, setSysDark] = useState(systemDark);
  const resolved = theme === 'system' ? (sysDark ? 'dark' : 'light') : theme;

  // Follow OS changes while on "system"
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const on = (e) => setSysDark(e.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    // Brief class so colours cross-fade instead of snapping
    root.classList.add('theme-anim');
    root.dataset.theme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#101012' : '#f1ebde');
    const t = setTimeout(() => root.classList.remove('theme-anim'), 400);
    return () => clearTimeout(t);
  }, [resolved]);

  const setTheme = useCallback((t) => {
    setThemeState(t);
    try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
  }, []);
  const toggle = useCallback(() => setTheme(resolved === 'dark' ? 'light' : 'dark'), [resolved, setTheme]);

  return <ThemeContext.Provider value={{ theme, resolved, setTheme, toggle }}>{children}</ThemeContext.Provider>;
}

// Sun/moon switch used in the sidebar, mobile header and profile
export function ThemeToggle({ className = '', showLabel = false }) {
  const { resolved, toggle } = useTheme();
  const dark = resolved === 'dark';
  return (
    <button type="button" className={`theme-toggle ${dark ? 'is-dark' : ''} ${className}`} onClick={toggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <span className="tt-track">
        <span className="tt-knob">
          {dark
            ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>}
        </span>
      </span>
      {showLabel && <span className="lbl">{dark ? 'Dark' : 'Light'} mode</span>}
    </button>
  );
}
