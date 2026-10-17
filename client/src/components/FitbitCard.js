import React, { useEffect, useState } from 'react';
import { api } from '../context/AuthContext';
import { isNativeApp, openExternal } from '../platform';

// Profile → Apps: link a Fitbit (Google) account and pull steps, sleep,
// workouts and weight. Tokens stay on the server; this only shows status.
export default function FitbitCard({ onSynced }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = () => api.get('/integrations/fitbit/status').then(r => setStatus(r.data)).catch(() => setStatus({ configured: false }));
  useEffect(() => {
    load();
    // Back from Fitbit's consent screen (/profile?fitbit=connected|denied|error)
    const result = new URLSearchParams(window.location.search).get('fitbit');
    if (result) {
      if (result === 'connected') setMsg('Fitbit connected. Your last 7 days are synced ✓');
      else setError(result === 'denied' ? 'Fitbit access was not allowed.' : 'Could not connect Fitbit. Try again.');
      window.history.replaceState(null, '', window.location.pathname);
    }
    // In the app, Fitbit opens in the in-app browser; refresh when the user comes back
    if (!isNativeApp) return undefined;
    const onFocus = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, []);

  const run = async (fn) => {
    setBusy(true); setError(''); setMsg('');
    try { await fn(); } catch (err) { setError(err.response?.data?.message || err.message); } finally { setBusy(false); }
  };

  const connect = () => run(async () => {
    const { data } = await api.post('/integrations/fitbit/connect');
    if (isNativeApp) await openExternal(data.url); // comes back to the website; the app refreshes on return
    else window.location.assign(data.url);
  });
  const sync = () => run(async () => {
    const { data } = await api.post('/integrations/fitbit/sync');
    const s = data.synced;
    setMsg(`Synced ✓ ${s.steps} days of steps, ${s.sleep} nights, ${s.workouts} workouts, ${s.weight} weigh-ins`);
    load(); onSynced?.();
  });
  const disconnect = () => run(async () => { await api.delete('/integrations/fitbit'); load(); });

  if (!status) return <p className="muted-p">Loading…</p>;
  return (
    <div className="app-link">
      <div className="app-link-head">
        <div className="app-logo fitbit" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="4" r="2"/><circle cx="12" cy="9" r="2"/><circle cx="12" cy="14" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="17" cy="9" r="1.6"/><circle cx="17" cy="14" r="1.6"/><circle cx="7" cy="9" r="1.6"/><circle cx="7" cy="14" r="1.6"/><circle cx="21" cy="11.5" r="1.2"/></svg>
        </div>
        <div>
          <div className="t">Fitbit <span className="s">by Google</span></div>
          <div className="s">
            {!status.configured ? 'Not set up on the server yet'
              : status.connected ? `Connected · last sync ${status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : 'never'}`
                : 'Steps, sleep, workouts and weight from your Fitbit or Pixel Watch'}
          </div>
        </div>
      </div>
      {status.configured && (
        <div className="app-link-actions">
          {status.connected ? <>
            <button className="btn primary sm" disabled={busy} onClick={sync}>{busy ? 'Syncing…' : 'Sync now'}</button>
            <button className="btn ghost sm" disabled={busy} onClick={disconnect}>Disconnect</button>
          </> : <button className="btn primary sm" disabled={busy} onClick={connect}>Connect Fitbit</button>}
        </div>
      )}
      {!status.configured && <div className="notice">Needs FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET and FITBIT_REDIRECT_URI on the server (see server/.env.example).</div>}
      {error && <div className="alert">{error}</div>}
      {msg && <div className="notice">{msg}</div>}
      <p className="hint">Syncing never lowers numbers you typed yourself, and each workout is only added once.</p>
    </div>
  );
}
