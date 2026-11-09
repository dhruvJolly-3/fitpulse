import React, { useEffect, useState } from 'react';
import { api } from '../context/AuthContext';
import { pushSupport, enablePush, disablePush, currentSubscription } from '../utils/push';

const ROWS = [
  { kind: 'water', icon: '💧', title: 'Hydration', hint: 'Only when you are behind pace' },
  { kind: 'workout', icon: '🏋️', title: 'Workout', hint: 'Skipped once today is logged' },
  { kind: 'meals', icon: '🍽️', title: 'Food log', hint: 'If under half your calories are logged' },
  { kind: 'sleep', icon: '🌙', title: 'Bedtime', hint: 'Wind-down nudge' },
  { kind: 'weighIn', icon: '⚖️', title: 'Weigh-in', hint: 'Skipped if you already weighed in' },
];

const Switch = ({ on, onChange, disabled, label }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? 'on' : ''}`} disabled={disabled} onClick={() => onChange(!on)} />
);

export default function RemindersCard() {
  const [config, setConfig] = useState(null);
  const [settings, setSettings] = useState(null);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const support = pushSupport();

  useEffect(() => {
    api.get('/reminders/config').then(r => setConfig(r.data)).catch(() => {});
    api.get('/reminders/settings').then(r => setSettings(r.data)).catch(() => {});
    currentSubscription().then(s => setSubscribed(Boolean(s))).catch(() => {});
  }, []);

  const save = async (patch) => {
    setSettings(s => ({ ...s, reminders: deepMerge(s.reminders, patch) })); // optimistic
    try {
      const { data } = await api.put('/reminders/settings', patch);
      setSettings(s => ({ ...s, ...data }));
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not save');
      api.get('/reminders/settings').then(r => setSettings(r.data));
    }
  };

  const toggleMaster = async (on) => {
    setMsg('');
    setBusy(true);
    try {
      if (on) {
        if (support.ok && config?.webPush && !subscribed) {
          await enablePush(config.vapidPublicKey);
          setSubscribed(true);
        }
        // Save the browser's timezone so reminders fire at local time
        await api.put('/reminders/settings', { enabled: true, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      } else {
        await disablePush();
        setSubscribed(false);
        await api.put('/reminders/settings', { enabled: false });
      }
      const { data } = await api.get('/reminders/settings');
      setSettings(data);
    } catch (err) {
      setMsg(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setMsg('');
    try {
      const { data } = await api.post('/reminders/test');
      setMsg(`Test sent to ${data.delivered} of ${data.devices} device${data.devices === 1 ? '' : 's'}.`);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Could not send a test');
    }
  };

  if (!settings) return null;
  const r = settings.reminders;
  const pushNote = !support.ok ? support.reason
    : config && !config.webPush ? 'Browser push is not configured on the server yet (VAPID keys). The mobile app can still receive reminders.'
      : null;

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <h3>Smart reminders</h3>
          <span className="label">{settings.devices} device{settings.devices === 1 ? '' : 's'} · {settings.timezone}</span>
        </div>
        <Switch on={r.enabled} onChange={toggleMaster} disabled={busy} label="Reminders on or off" />
      </div>
      {pushNote && <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>{pushNote}</p>}
      {msg && <div className="alert" style={{ marginBottom: 10 }}>{msg}</div>}

      <div style={{ opacity: r.enabled ? 1 : 0.5, pointerEvents: r.enabled ? 'auto' : 'none' }}>
        {ROWS.map(row => (
          <div key={row.kind} className="reminder-row">
            <span style={{ fontSize: 18 }}>{row.icon}</span>
            <div>
              <div className="t">{row.title}</div>
              <div className="s">{row.hint}</div>
            </div>
            <div className="end">
              {row.kind === 'water' ? (
                <>
                  <select value={r.water.everyHours} onChange={e => save({ water: { everyHours: +e.target.value } })} aria-label="Water reminder interval" style={{ width: 'auto', padding: '8px 10px' }}>
                    {[1, 2, 3, 4].map(h => <option key={h} value={h}>every {h}h</option>)}
                  </select>
                  <input type="time" value={r.water.from} onChange={e => save({ water: { from: e.target.value } })} aria-label="Water reminders from" />
                  <input type="time" value={r.water.to} onChange={e => save({ water: { to: e.target.value } })} aria-label="Water reminders until" />
                </>
              ) : (
                <input type="time" value={r[row.kind].time} onChange={e => save({ [row.kind]: { time: e.target.value } })} aria-label={`${row.title} reminder time`} />
              )}
              <Switch on={r[row.kind].on} onChange={on => save({ [row.kind]: { on } })} label={`${row.title} reminder`} />
            </div>
          </div>
        ))}
      </div>
      {r.enabled && settings.devices > 0 && (
        <button className="btn ghost sm" style={{ marginTop: 12 }} onClick={sendTest}>Send a test notification</button>
      )}
    </div>
  );
}

function deepMerge(a, b) {
  const out = { ...a };
  Object.entries(b).forEach(([k, v]) => {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...(a?.[k] || {}), ...v } : v;
  });
  return out;
}
