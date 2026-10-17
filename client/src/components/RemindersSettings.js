import React, { useEffect, useState } from 'react';
import { api } from '../context/AuthContext';
import { isNativeApp } from '../platform';
import {
  notificationSupport, enableWebPush, disableWebPush, isWebSubscribed,
  enableNativeReminders, disableNativeReminders, nativeRemindersOn, rescheduleNative,
} from '../utils/notifications';

// Profile → Reminders. Each reminder only fires when its goal isn't met yet.
const ROWS = [
  { group: 'water', label: '💧 Water', hint: "Only when you're behind your day's pace" },
  { group: 'meals', label: '🍽️ Meals', hint: "Only if that meal isn't logged yet" },
  { group: 'workout', label: '🏋️ Workout', hint: 'Only if no workout is logged today' },
  { group: 'weighIn', label: '⚖️ Morning weigh-in', hint: "Only if you haven't weighed in today" },
  { group: 'bedtime', label: '🌙 Bedtime', hint: 'A nudge to wind down for your sleep target' },
];

const Time = ({ value, onChange, label }) => (
  <input type="time" value={value} onChange={e => onChange(e.target.value)} aria-label={label} className="time-input" />
);

export default function RemindersSettings() {
  const [settings, setSettings] = useState(null);
  const [deviceOn, setDeviceOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const support = notificationSupport();

  useEffect(() => {
    api.get('/reminders/settings').then(r => setSettings(r.data)).catch(() => setError('Could not load reminder settings'));
    if (isNativeApp) setDeviceOn(nativeRemindersOn());
    else if (support.ok) isWebSubscribed().then(setDeviceOn);
  }, [support.ok]);

  if (!settings) return error ? <div className="alert">{error}</div> : <p className="muted-p">Loading…</p>;
  const r = settings.reminders;
  const set = (group, field, value) => setSettings(s => ({ ...s, reminders: { ...s.reminders, [group]: { ...s.reminders[group], [field]: value } } }));

  const run = async (fn, ok) => {
    setBusy(true); setError(''); setMsg('');
    try { await fn(); if (ok) setMsg(ok); } catch (err) { setError(err.response?.data?.message || err.message); } finally { setBusy(false); }
  };

  const save = (enabled = r.enabled) => run(async () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { data } = await api.put('/reminders/settings', { timezone, reminders: { ...r, enabled } });
    setSettings(data);
    if (isNativeApp) await rescheduleNative();
  }, 'Saved ✓');

  const turnOn = () => run(async () => {
    if (isNativeApp) await enableNativeReminders();
    else await enableWebPush(settings.push.publicKey);
    setDeviceOn(true);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { data } = await api.put('/reminders/settings', { timezone, reminders: { ...r, enabled: true } });
    setSettings(data);
    if (isNativeApp) await rescheduleNative();
  }, 'Reminders are on for this device ✓');

  const turnOff = () => run(async () => {
    if (isNativeApp) await disableNativeReminders(); else await disableWebPush();
    setDeviceOn(false);
  }, 'Reminders are off on this device');

  const test = () => run(async () => {
    if (isNativeApp) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.schedule({ notifications: [{ id: 1, title: 'FitPulse reminders are on ✅', body: "You'll get nudges only when you're behind on a goal.", schedule: { at: new Date(Date.now() + 2000) } }] });
    } else {
      const { data } = await api.post('/reminders/test');
      if (!data.sent) throw new Error('No subscribed browser found. Turn reminders on first.');
    }
  }, 'Test sent. It should arrive in a few seconds.');

  const webUnavailable = !isNativeApp && support.ok && !settings.push.configured;

  return (
    <div className="reminders">
      <div className="reminder-device">
        <div>
          <div className="t">{deviceOn && r.enabled ? 'Reminders are on' : 'Reminders are off'}</div>
          <div className="s">{isNativeApp ? 'Delivered by your phone, even offline.' : 'Delivered by your browser, even when FitPulse is closed.'}</div>
        </div>
        {!support.ok ? null : deviceOn && r.enabled
          ? <button className="btn ghost sm" disabled={busy} onClick={turnOff}>Turn off</button>
          : <button className="btn primary sm" disabled={busy || webUnavailable} onClick={turnOn}>Turn on reminders</button>}
      </div>
      {!support.ok && <div className="notice">{support.reason}</div>}
      {webUnavailable && <div className="notice">Reminders need push keys on the server (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY). See server/.env.example.</div>}

      {ROWS.map(({ group, label, hint }) => (
        <div key={group} className="reminder-row">
          <label className="switch">
            <input type="checkbox" checked={r[group].on} onChange={e => set(group, 'on', e.target.checked)} />
            <span className="track" /><span className="lbl">{label}</span>
          </label>
          <div className="reminder-times">
            {group === 'water' && <>
              <span>every</span>
              <select value={r.water.everyHours} onChange={e => set('water', 'everyHours', +e.target.value)} aria-label="Water reminder interval">
                {[1, 2, 3, 4].map(h => <option key={h} value={h}>{h} h</option>)}
              </select>
              <Time value={r.water.from} onChange={v => set('water', 'from', v)} label="Water reminders from" />
              <span>to</span>
              <Time value={r.water.to} onChange={v => set('water', 'to', v)} label="Water reminders until" />
            </>}
            {group === 'meals' && ['breakfast', 'lunch', 'dinner'].map(m => (
              <Time key={m} value={r.meals[m]} onChange={v => set('meals', m, v)} label={`${m} reminder`} />
            ))}
            {['workout', 'weighIn', 'bedtime'].includes(group) && <Time value={r[group].time} onChange={v => set(group, 'time', v)} label={`${group} reminder`} />}
          </div>
          <div className="hint">{hint}</div>
        </div>
      ))}

      {error && <div className="alert">{error}</div>}
      {msg && <div className="notice">{msg}</div>}
      <div className="reminder-actions">
        <button className="btn primary" disabled={busy} onClick={() => save()}>{busy ? 'Saving…' : 'Save reminder times'}</button>
        {deviceOn && <button className="btn ghost" disabled={busy} onClick={test}>Send a test</button>}
      </div>
    </div>
  );
}
