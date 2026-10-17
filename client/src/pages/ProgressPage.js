import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useAuth, api } from '../context/AuthContext';
import useToday from '../utils/useToday';
import Pulse from '../components/Pulse';
import PhotoViewer from '../components/PhotoViewer';
import { preparePhoto } from '../utils/image';
import { colorsFor } from '../theme';
import { useTheme } from '../context/ThemeContext';

// Progress: daily weigh-ins with a smoothed trend, and progress photos you can
// compare side by side. The newest weigh-in also updates your calorie targets.
const RANGES = [{ days: 30, label: '30D' }, { days: 90, label: '90D' }, { days: 365, label: '1Y' }];

// 7-day rolling average: smooths out day-to-day water-weight swings
const withTrend = (logs) => logs.map((l, i) => {
  const t = parseISO(l.date);
  const win = logs.slice(0, i + 1).filter(x => differenceInCalendarDays(t, parseISO(x.date)) < 7);
  return { ...l, trend: Math.round((win.reduce((s, x) => s + x.weight, 0) / win.length) * 10) / 10 };
});

function WeightChart({ data, goal }) {
  const C = colorsFor(useTheme().resolved);
  const weights = data.map(d => d.weight).concat(goal ? [goal] : []);
  const lo = Math.floor(Math.min(...weights) - 1), hi = Math.ceil(Math.max(...weights) + 1);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
        <XAxis dataKey="date" tickFormatter={d => format(parseISO(d), 'd MMM')} minTickGap={28}
          tick={{ fontSize: 10, fill: C.ink50, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} />
        <YAxis domain={[lo, hi]} tick={{ fontSize: 10, fill: C.ink50, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          contentStyle={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 12, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}
          labelFormatter={d => format(parseISO(d), 'EEE d MMM')}
          formatter={(v, name) => [`${v} kg`, name === 'trend' ? '7-day average' : 'Weigh-in']}
        />
        {goal ? <ReferenceLine y={goal} stroke={C.coral} strokeDasharray="4 4" strokeOpacity={0.7} label={{ value: `goal ${goal}`, position: 'insideTopRight', fill: C.coral, fontSize: 10 }} /> : null}
        <Line type="monotone" dataKey="weight" stroke={C.ink50} strokeWidth={0} dot={{ r: 3, fill: C.ink50, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
        <Line type="monotone" dataKey="trend" stroke={C.matcha2} strokeWidth={3} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function PhotoUploader({ date, defaultWeight, onUploaded }) {
  const input = useRef(null);
  const [pose, setPose] = useState('front');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const upload = async (file) => {
    if (!file) return;
    setBusy(true); setError('');
    try {
      const { image, thumb } = await preparePhoto(file);
      await api.post('/photos', { kind: 'progress', date, pose, image, thumb, weight: defaultWeight || undefined });
      onUploaded();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally { setBusy(false); input.current.value = ''; }
  };
  return (
    <div className="photo-uploader">
      <div className="seg" style={{ width: 'auto' }}>
        {['front', 'side', 'back'].map(p => <button key={p} type="button" className={pose === p ? 'on' : ''} onClick={() => setPose(p)}>{p}</button>)}
      </div>
      <button className="btn primary sm" onClick={() => input.current.click()} disabled={busy}>
        {busy ? 'Uploading…' : '📷 Add photo'}
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={e => upload(e.target.files[0])} />
      {error && <div className="alert" style={{ width: '100%', margin: 0 }}>{error}</div>}
      <p className="hint" style={{ width: '100%', margin: 0 }}>Photos stay private to your account. Same spot, same light and same pose make the best comparisons.</p>
    </div>
  );
}

function CompareView({ pair, onClose }) {
  const [imgs, setImgs] = useState({});
  useEffect(() => {
    pair.forEach(p => api.get(`/photos/${p._id}`).then(r => setImgs(s => ({ ...s, [p._id]: r.data.image }))).catch(() => {}));
  }, [pair]);
  const [a, b] = [...pair].sort((x, y) => x.date.localeCompare(y.date));
  const days = differenceInCalendarDays(parseISO(b.date), parseISO(a.date));
  const diff = a.weight && b.weight ? Math.round((b.weight - a.weight) * 10) / 10 : null;
  return (
    <div className="modal-overlay viewer" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="compare">
        {[a, b].map((p, i) => (
          <figure key={p._id}>
            <img src={imgs[p._id] || p.thumb} alt={i ? 'After' : 'Before'} />
            <figcaption><b>{i ? 'After' : 'Before'}</b> · {format(parseISO(p.date), 'd MMM yyyy')}{p.weight ? ` · ${p.weight} kg` : ''}</figcaption>
          </figure>
        ))}
        <div className="compare-bar">
          <span className="mono">{days} days apart{diff != null ? ` · ${diff > 0 ? '+' : ''}${diff} kg` : ''}</span>
          <button className="btn primary sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const { user, updateUser } = useAuth();
  const today = useToday();
  const [range, setRange] = useState(90);
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState({ date: today, weight: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [photos, setPhotos] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [picked, setPicked] = useState([]);

  const load = useCallback(() => api.get('/weight', { params: { days: range } }).then(r => setLogs(r.data)).catch(() => {}), [range]);
  const loadPhotos = () => api.get('/photos', { params: { kind: 'progress' } }).then(r => setPhotos(r.data)).catch(() => {});
  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadPhotos(); }, []);
  useEffect(() => { setForm(f => ({ ...f, date: today })); }, [today]);

  const data = useMemo(() => withTrend(logs), [logs]);
  const latest = logs[logs.length - 1];
  const first = logs[0];
  const goal = user?.profile?.targetWeight;
  const change = latest && first && latest !== first ? Math.round((latest.weight - first.weight) * 10) / 10 : null;
  const toGo = latest && goal ? Math.round((latest.weight - goal) * 10) / 10 : null;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const { data: r } = await api.post('/weight', { date: form.date, weight: +form.weight });
      // Targets follow the newest weigh-in; refresh them everywhere in the app
      if (r.log) api.get('/user/profile').then(p => updateUser(p.data)).catch(() => {});
      setForm(f => ({ ...f, weight: '' }));
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save');
    } finally { setSaving(false); }
  };

  const remove = async (date) => {
    await api.delete(`/weight/${date}`);
    load();
    api.get('/user/profile').then(r => updateUser(r.data)).catch(() => {});
  };

  const deletePhoto = async (p) => {
    await api.delete(`/photos/${p._id}`);
    setViewing(null);
    loadPhotos();
  };

  const togglePick = (p) => setPicked(s => s.some(x => x._id === p._id) ? s.filter(x => x._id !== p._id) : [...s, p].slice(-2));

  return (
    <div className="fade-up">
      <header className="page-header">
        <div className="page-heading">
          <Pulse mood="cheer" />
          <div>
            <h1 className="page-title">Progress</h1>
            <div className="page-date">weight trend & progress photos</div>
          </div>
        </div>
      </header>

      <div className="page-body">
        <div className="grid g-12">
          <div className="card dark span-4">
            <div className="card-h"><span className="label">current weight</span>{latest && <span className="pill matcha">{format(parseISO(latest.date), 'd MMM')}</span>}</div>
            <div className="num" style={{ fontSize: 64, lineHeight: 1 }}>
              {latest ? latest.weight : (user?.profile?.weight || '—')}<span className="serif-it" style={{ fontSize: '0.4em', color: 'var(--matcha)' }}> kg</span>
            </div>
            <div className="progress-facts">
              {change != null && <div><span className="label">{range}D change</span><b>{change > 0 ? '+' : ''}{change} kg</b></div>}
              {toGo != null && <div><span className="label">to goal</span><b>{toGo === 0 ? 'reached 🎉' : `${Math.abs(toGo)} kg`}</b></div>}
            </div>
            <form className="weigh-form" onSubmit={save}>
              <input type="number" inputMode="decimal" step="0.1" min="20" max="400" placeholder="Weight (kg)" value={form.weight}
                onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} required aria-label="Weight in kg" />
              <input type="date" value={form.date} max={today} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required aria-label="Date" />
              <button className="btn primary" disabled={saving || !form.weight}>{saving ? 'Saving…' : 'Log weight'}</button>
            </form>
            {error && <div className="alert" style={{ marginTop: 10, marginBottom: 0 }}>{error}</div>}
            <p className="hint" style={{ color: 'var(--cream-50)', marginTop: 10 }}>Your newest weigh-in updates your calorie and macro targets.</p>
          </div>

          <div className="card span-8">
            <div className="card-h">
              <div>
                <h3>Weight trend</h3>
                <span className="label">dots = weigh-ins · line = 7-day average{goal ? ' · dashed = goal' : ''}</span>
              </div>
              <div className="seg" style={{ width: 'auto', minWidth: 150 }}>
                {RANGES.map(r => <button key={r.days} type="button" className={range === r.days ? 'on' : ''} onClick={() => setRange(r.days)}>{r.label}</button>)}
              </div>
            </div>
            {data.length >= 2 ? <WeightChart data={data} goal={goal} /> : (
              <div className="empty" style={{ padding: '28px 0' }}>
                <h3>Log a few weigh-ins <span className="serif-it">to see your trend</span></h3>
                <p>Weigh yourself in the morning, after the bathroom and before breakfast.</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid g-12">
          <div className="card span-4">
            <div className="card-h"><h3>Recent weigh-ins</h3><span className="label">{logs.length} in {range}D</span></div>
            {[...logs].reverse().slice(0, 8).map(l => (
              <div key={l.date} className="line-item">
                <div>
                  <div className="t">{l.weight} kg</div>
                  <div className="s mono">{format(parseISO(l.date), 'EEE d MMM')}{l.source === 'fitbit' ? ' · Fitbit' : ''}</div>
                </div>
                <div className="end">
                  <button className="icon-btn" onClick={() => remove(l.date)} title="Delete weigh-in">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                  </button>
                </div>
              </div>
            ))}
            {!logs.length && <p className="muted-p">No weigh-ins yet.</p>}
          </div>

          <div className="card span-8">
            <div className="card-h">
              <div><h3>Progress <span className="serif-it">photos</span></h3><span className="label">{photos.length} photos</span></div>
              {photos.length >= 2 && (
                <button className={`btn sm ${comparing ? 'primary' : 'ghost'}`} onClick={() => { setComparing(c => !c); setPicked([]); }}>
                  {comparing ? 'Cancel' : 'Compare'}
                </button>
              )}
            </div>
            {comparing
              ? <p className="muted-p">Pick two photos to see them side by side ({picked.length}/2).</p>
              : <PhotoUploader date={today} defaultWeight={latest?.date === today ? latest.weight : undefined} onUploaded={loadPhotos} />}
            <div className="photo-grid">
              {photos.map(p => {
                const on = picked.some(x => x._id === p._id);
                return (
                  <button key={p._id} className={`photo-cell ${on ? 'on' : ''}`} onClick={() => (comparing ? togglePick(p) : setViewing(p))}>
                    <img src={p.thumb} alt={`${p.pose || 'progress'} photo ${p.date}`} loading="lazy" />
                    <span className="photo-tag">{format(parseISO(p.date), 'd MMM')}{p.pose ? ` · ${p.pose}` : ''}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {viewing && <PhotoViewer photo={viewing} onClose={() => setViewing(null)} onDelete={deletePhoto} />}
      {comparing && picked.length === 2 && <CompareView pair={picked} onClose={() => { setPicked([]); setComparing(false); }} />}
    </div>
  );
}
