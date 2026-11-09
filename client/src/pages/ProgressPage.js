import React, { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import Pulse from '../components/Pulse';
import { useAuth, api } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { colorsFor } from '../theme';
import useToday from '../utils/useToday';
import useAuthedImage from '../utils/useAuthedImage';
import { compressPhoto } from '../utils/image';

const RANGES = [{ d: 30, l: '30D' }, { d: 90, l: '90D' }, { d: 365, l: '1Y' }];
const POSES = ['front', 'side', 'back', 'other'];

const errMsg = (err, fallback) => err.response?.data?.message || fallback;

function WeightChart({ entries, target }) {
  const COLORS = colorsFor(useTheme().resolved);
  if (entries.length < 2) {
    return <p className="muted" style={{ fontSize: 13, padding: '40px 0', textAlign: 'center' }}>Log at least two weigh-ins to see your trend.</p>;
  }
  const data = entries.map(e => ({ ...e, label: format(new Date(`${e.date}T12:00:00`), 'd MMM') }));
  const values = entries.map(e => e.weight).concat(target ? [target] : []);
  const lo = Math.floor(Math.min(...values) - 1);
  const hi = Math.ceil(Math.max(...values) + 1);
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.line} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: COLORS.ink50, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis domain={[lo, hi]} tick={{ fontSize: 10, fill: COLORS.ink50, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          contentStyle={{ background: COLORS.paper, border: `1px solid ${COLORS.line}`, borderRadius: 12, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}
          formatter={(v, name) => [`${v} kg`, name === 'trend' ? '7-entry trend' : 'Weigh-in']}
        />
        {target ? <ReferenceLine y={target} stroke={COLORS.matcha2} strokeDasharray="5 5" label={{ value: `goal ${target}`, fontSize: 10, fill: COLORS.ink50, position: 'insideTopRight' }} /> : null}
        <Line type="monotone" dataKey="weight" stroke={COLORS.ink50} strokeWidth={0} dot={{ r: 3, fill: COLORS.ink50 }} isAnimationActive={false} />
        <Line type="monotone" dataKey="trend" stroke={COLORS.coral} strokeWidth={2.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function PhotoThumb({ photo, selected, onClick }) {
  const src = useAuthedImage(`/photos/${photo._id}/image?size=thumb`);
  return (
    <button type="button" className={`photo-thumb ${selected ? 'selected' : ''}`} onClick={onClick} title={`${photo.date} · ${photo.pose}`}>
      {src ? <img src={src} alt={`${photo.pose} progress photo from ${photo.date}`} /> : <span className="photo-ph" />}
      <span className="photo-cap mono">{format(new Date(`${photo.date}T12:00:00`), 'd MMM yy')}{photo.weight ? ` · ${photo.weight}kg` : ''}</span>
    </button>
  );
}

function FullPhoto({ photo }) {
  const src = useAuthedImage(`/photos/${photo._id}/image`);
  return (
    <figure className="photo-full">
      {src ? <img src={src} alt={`${photo.pose} progress photo from ${photo.date}`} /> : <div className="photo-ph tall" />}
      <figcaption className="mono">
        {format(new Date(`${photo.date}T12:00:00`), 'EEE d MMM yyyy')} · {photo.pose}{photo.weight ? ` · ${photo.weight} kg` : ''}
        {photo.note ? <div className="muted" style={{ marginTop: 4 }}>{photo.note}</div> : null}
      </figcaption>
    </figure>
  );
}

export default function ProgressPage() {
  const today = useToday();
  const { user, updateUser } = useAuth();
  const [range, setRange] = useState(90);
  const [history, setHistory] = useState({ entries: [], summary: {} });
  const [form, setForm] = useState({ weight: '', bodyFat: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [photos, setPhotos] = useState([]);
  const [pose, setPose] = useState('front');
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [viewer, setViewer] = useState(null); // photo shown full-size
  const [compare, setCompare] = useState([]); // up to two photo ids
  const fileRef = useRef(null);

  const loadHistory = (days = range) =>
    api.get(`/weight/history?days=${days}&endDate=${today}`).then(r => setHistory(r.data)).catch(() => {});
  const loadPhotos = () => api.get('/photos').then(r => setPhotos(r.data)).catch(() => {});

  useEffect(() => { loadHistory(); loadPhotos(); }, [today]);

  const todayEntry = history.entries.find(e => e.date === today);
  const latest = history.entries[history.entries.length - 1];
  const { summary } = history;
  const target = user?.profile?.targetWeight;
  const toGo = latest && target ? Math.round((latest.weight - target) * 10) / 10 : null;

  const logWeight = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await api.post('/weight', { date: today, weight: +form.weight, bodyFat: form.bodyFat ? +form.bodyFat : undefined });
      if (data.user) updateUser(data.user); // new weight → new calorie targets
      setForm({ weight: '', bodyFat: '' });
      loadHistory();
    } catch (err) {
      setError(errMsg(err, 'Could not save your weigh-in'));
    } finally {
      setSaving(false);
    }
  };

  const removeEntry = async (date) => {
    const { data } = await api.delete(`/weight/${date}`);
    if (data.user) updateUser(data.user);
    loadHistory();
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    setPhotoError('');
    setUploading(true);
    try {
      const { image, thumb } = await compressPhoto(file);
      await api.post('/photos', { date: today, pose, image, thumb });
      loadPhotos();
    } catch (err) {
      setPhotoError(errMsg(err, err.message || 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (id) => {
    await api.delete(`/photos/${id}`);
    setViewer(null);
    setCompare(c => c.filter(x => x !== id));
    loadPhotos();
  };

  const toggleCompare = (id) => setCompare(c => (c.includes(id) ? c.filter(x => x !== id) : [...c, id].slice(-2)));
  const comparePhotos = compare.map(id => photos.find(p => p._id === id)).filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="fade-up">
      <header className="page-header">
        <div className="page-heading">
          <Pulse mood="cheer" />
          <div>
            <h1 className="page-title">Progress</h1>
            <div className="page-date">weight trend and progress photos</div>
          </div>
        </div>
      </header>

      <div className="page-body">
        <div className="grid g-12">
          <div className="card dark span-4 stat-tile">
            <div className="k">latest <span className="pill out">{latest ? format(new Date(`${latest.date}T12:00:00`), 'd MMM') : '—'}</span></div>
            <div className="v">{latest ? latest.weight : user?.profile?.weight || '—'}<span className="u">kg</span></div>
            <div className="d">
              {summary.change != null && summary.count > 1
                ? `${summary.change > 0 ? '+' : ''}${summary.change} kg over ${RANGES.find(r => r.d === range)?.l}`
                : 'Log weigh-ins to see your change'}
            </div>
          </div>
          <div className="card stat-tile span-4">
            <div className="k">goal</div>
            <div className="v">{target || '—'}<span className="u">kg</span></div>
            <div className="d">
              {toGo == null ? 'Set a target weight in your profile'
                : Math.abs(toGo) < 0.1 ? 'Goal reached 🎉'
                  : `${Math.abs(toGo)} kg to ${toGo > 0 ? 'lose' : 'gain'}`}
            </div>
          </div>
          <form className="card span-4" onSubmit={logWeight}>
            <div className="card-h"><h3>{todayEntry ? 'Update today' : "Today's weigh-in"}</h3><span className="label">{todayEntry ? `${todayEntry.weight} kg logged` : 'kg'}</span></div>
            <div className="field-row">
              <div className="input-affix">
                <input type="number" step="0.1" min="20" max="400" placeholder={String(latest?.weight || user?.profile?.weight || 70)}
                  value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} required aria-label="Weight in kg" />
                <span>kg</span>
              </div>
              <div className="input-affix">
                <input type="number" step="0.1" min="2" max="70" placeholder="Body fat"
                  value={form.bodyFat} onChange={e => setForm(f => ({ ...f, bodyFat: e.target.value }))} aria-label="Body fat percent (optional)" />
                <span>%</span>
              </div>
            </div>
            {error && <div className="alert" style={{ marginTop: 10 }}>{error}</div>}
            <button className="btn primary block" style={{ marginTop: 12 }} disabled={saving || !form.weight}>{saving ? 'Saving…' : 'Save weigh-in'}</button>
          </form>
        </div>

        <div className="grid g-12">
          <div className="card span-8">
            <div className="card-h">
              <div>
                <h3>Weight trend</h3>
                <span className="label">dots = weigh-ins · line = 7-entry average</span>
              </div>
              <div className="seg" style={{ width: 'auto', minWidth: 160 }}>
                {RANGES.map(r => (
                  <button key={r.d} type="button" className={range === r.d ? 'on' : ''} onClick={() => { setRange(r.d); loadHistory(r.d); }}>{r.l}</button>
                ))}
              </div>
            </div>
            <WeightChart entries={history.entries} target={target} />
          </div>
          <div className="card span-4">
            <div className="card-h"><h3>Recent weigh-ins</h3><span className="label">{summary.count || 0} in range</span></div>
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {[...history.entries].reverse().slice(0, 30).map(e => (
                <div key={e.date} className="line-item">
                  <div>
                    <div className="t">{e.weight} kg{e.bodyFat ? <span className="muted"> · {e.bodyFat}%</span> : null}</div>
                    <div className="s mono">{format(new Date(`${e.date}T12:00:00`), 'EEE d MMM')}{e.source && e.source !== 'manual' ? ' · synced' : ''}</div>
                  </div>
                  <div className="end">
                    <button className="icon-btn" onClick={() => removeEntry(e.date)} title="Delete weigh-in">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                    </button>
                  </div>
                </div>
              ))}
              {!history.entries.length && <p className="muted" style={{ fontSize: 13 }}>No weigh-ins in this range.</p>}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <div>
              <h3>Progress photos</h3>
              <span className="label">private to you · tap two photos to compare</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="chips">
                {POSES.map(p => (
                  <button key={p} type="button" className={`chip ${pose === p ? 'on' : ''}`} onClick={() => setPose(p)}>{p}</button>
                ))}
              </div>
              <input ref={fileRef} type="file" accept="image/*" capture="user" hidden onChange={onFile} />
              <button className="btn primary sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? 'Uploading…' : '+ Add photo'}
              </button>
            </div>
          </div>
          {photoError && <div className="alert" style={{ marginBottom: 12 }}>{photoError}</div>}

          {comparePhotos.length === 2 && (
            <div className="photo-compare">
              {comparePhotos.map(p => <FullPhoto key={p._id} photo={p} />)}
              <div className="photo-compare-foot">
                {comparePhotos[0].weight && comparePhotos[1].weight ? (
                  <span className="pill matcha">
                    {Math.round((comparePhotos[1].weight - comparePhotos[0].weight) * 10) / 10 > 0 ? '+' : ''}
                    {Math.round((comparePhotos[1].weight - comparePhotos[0].weight) * 10) / 10} kg between photos
                  </span>
                ) : null}
                <button className="btn ghost sm" onClick={() => setCompare([])}>Close compare</button>
              </div>
            </div>
          )}

          {photos.length ? (
            <div className="photo-grid">
              {photos.map(p => (
                <div key={p._id} className="photo-cell">
                  <PhotoThumb photo={p} selected={compare.includes(p._id)} onClick={() => toggleCompare(p._id)} />
                  <button className="photo-open" onClick={() => setViewer(p)} title="Open">⤢</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="ic"><Pulse mood="cheer" size={92} /></div>
              <h3>Your first photo is your <span className="serif-it">baseline</span></h3>
              <p>Same light, same pose, every 2–4 weeks. The scale misses what photos show.</p>
            </div>
          )}
        </div>
      </div>

      {viewer && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewer(null)}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-head">
              <div className="modal-title">Progress <span className="serif-it">photo</span></div>
              <button className="icon-btn" onClick={() => setViewer(null)} title="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <FullPhoto photo={viewer} />
            <button className="btn danger sm" style={{ marginTop: 14 }} onClick={() => deletePhoto(viewer._id)}>Delete photo</button>
          </div>
        </div>
      )}
    </div>
  );
}
