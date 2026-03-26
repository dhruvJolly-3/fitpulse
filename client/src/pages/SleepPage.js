import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { api, useAuth } from '../context/AuthContext';

const today = format(new Date(), 'yyyy-MM-dd');

export default function SleepPage() {
  const { user } = useAuth();
  const [log, setLog] = useState(null);
  const [form, setForm] = useState({ bedtime: '22:30', wakeTime: '06:30', quality: 4, notes: '' });
  const [saving, setSaving] = useState(false);
  const [weekLogs, setWeekLogs] = useState([]);
  const [editMode, setEditMode] = useState(false);

  const sleepTarget = user?.sleepTarget || 8;

  useEffect(() => {
    api.get(`/sleep/${today}`).then(r => { setLog(r.data); if (r.data) setEditMode(false); }).catch(() => {});
    const start = format(subDays(new Date(), 6), 'yyyy-MM-dd');
    api.get(`/sleep/history/week?startDate=${start}`).then(r => setWeekLogs(r.data)).catch(() => {});
  }, []);

  const calcDuration = (bed, wake) => {
    const [bh, bm] = bed.split(':').map(Number);
    const [wh, wm] = wake.split(':').map(Number);
    let hrs = (wh + (wm / 60)) - (bh + (bm / 60));
    if (hrs < 0) hrs += 24;
    return Math.round(hrs * 10) / 10;
  };

  const saveSleep = async () => {
    setSaving(true);
    try {
      const bedtimeDate = new Date(`${today}T${form.bedtime}:00`);
      let wakeDate = new Date(`${today}T${form.wakeTime}:00`);
      if (wakeDate <= bedtimeDate) wakeDate.setDate(wakeDate.getDate() + 1);
      const duration = calcDuration(form.bedtime, form.wakeTime);

      const { data } = await api.post('/sleep', {
        date: today, bedtime: bedtimeDate, wakeTime: wakeDate,
        duration, quality: form.quality, notes: form.notes
      });
      setLog(data);
      setEditMode(false);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const duration = log?.duration || calcDuration(form.bedtime, form.wakeTime);
  const isGood = duration >= sleepTarget;

  const weekChartData = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    const found = weekLogs.find(l => l.date === d);
    return { day: format(subDays(new Date(), 6 - i), 'EEE'), hours: found?.duration || 0, quality: found?.quality || 0 };
  });

  const qualityStars = (q) => '★'.repeat(q) + '☆'.repeat(5 - q);

  return (
    <div className="fade-up">
      <div className="page-header">
        <h1 className="page-title">Sleep</h1>
        <p className="page-subtitle">Track your recovery and sleep quality</p>
      </div>

      <div className="page-body">
        {/* Tonight's summary */}
        <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg, rgba(167,139,250,0.12) 0%, rgba(91,142,255,0.08) 100%)', borderColor: 'rgba(167,139,250,0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="card-title">Last Night</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--purple)', lineHeight: 1 }}>
                {log?.duration || (editMode ? calcDuration(form.bedtime, form.wakeTime) : '—')}<span style={{ fontSize: '1.4rem' }}>h</span>
              </div>
              {log && (
                <div style={{ marginTop: 8 }}>
                  <span style={{ fontSize: '1.2rem', color: 'gold' }}>{qualityStars(log.quality || 0)}</span>
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '3rem', marginBottom: 8 }}>🌙</div>
              <span className={`badge ${isGood ? 'badge-green' : 'badge-orange'}`}>
                {isGood ? 'Well Rested' : 'Below Target'}
              </span>
            </div>
          </div>

          {log && !editMode && (
            <div style={{ display: 'flex', gap: 20, marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              {[
                { label: 'Bedtime', val: log.bedtime ? new Date(log.bedtime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' },
                { label: 'Wake Time', val: log.wakeTime ? new Date(log.wakeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—' },
                { label: 'Target', val: `${sleepTarget}h` },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{s.val}</div>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setEditMode(true)}>
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Log form */}
        {(!log || editMode) && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">Log Sleep</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Bedtime</label>
                <input type="time" value={form.bedtime} onChange={e => setForm(p => ({ ...p, bedtime: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Wake Time</label>
                <input type="time" value={form.wakeTime} onChange={e => setForm(p => ({ ...p, wakeTime: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Sleep Quality</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setForm(p => ({ ...p, quality: s }))}
                    style={{ flex: 1, padding: '10px', borderRadius: 'var(--r-md)', border: `1px solid ${form.quality >= s ? 'rgba(255,215,0,0.5)' : 'var(--border)'}`, background: form.quality >= s ? 'rgba(255,215,0,0.1)' : 'transparent', fontSize: '1.2rem', cursor: 'pointer' }}>
                    {form.quality >= s ? '★' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <input placeholder="e.g. Woke up once, vivid dreams…" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4, padding: '10px 14px', background: 'var(--bg-raised)', borderRadius: 'var(--r-md)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>Estimated duration:</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--purple)' }}>
                {calcDuration(form.bedtime, form.wakeTime)}h
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              {editMode && <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditMode(false)}>Cancel</button>}
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={saveSleep} disabled={saving}>
                {saving ? 'Saving…' : '💾 Save Sleep Log'}
              </button>
            </div>
          </div>
        )}

        {/* Metrics grid */}
        <div className="grid-4" style={{ marginBottom: 16 }}>
          {[
            { label: 'Target', val: `${sleepTarget}h`, color: 'var(--text)' },
            { label: 'Duration', val: log?.duration ? `${log.duration}h` : '—', color: 'var(--purple)' },
            { label: 'Deficit', val: log?.duration ? `${Math.max(sleepTarget - log.duration, 0)}h` : '—', color: 'var(--red)' },
            { label: 'Avg (7d)', val: weekChartData.length ? `${(weekChartData.reduce((s,d) => s + d.hours, 0) / 7).toFixed(1)}h` : '—', color: 'var(--accent2)' },
          ].map(m => (
            <div key={m.label} className="metric-tile">
              <span className="label">{m.label}</span>
              <span className="value" style={{ fontSize: '1.6rem', color: m.color }}>{m.val}</span>
            </div>
          ))}
        </div>

        {/* Weekly chart */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">7-Night History</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weekChartData} barCategoryGap="35%">
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} hide />
              <Tooltip contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={v => [`${v}h`, 'Sleep']} />
              <ReferenceLine y={sleepTarget} stroke="var(--purple)" strokeDasharray="4 4" strokeOpacity={0.6} />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                {weekChartData.map((d, i) => (
                  <Cell key={i} fill={d.hours >= sleepTarget ? '#a78bfa' : '#a78bfa55'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: '0.72rem', color: 'var(--text-3)' }}>
            <div style={{ width: 20, height: 2, background: 'var(--purple)', borderRadius: 1 }} />
            {sleepTarget}h target
          </div>
        </div>

        {/* Apple Health sync note */}
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(255,45,85,0.08), rgba(91,142,255,0.08))', borderColor: 'rgba(255,45,85,0.2)' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <span style={{ fontSize: '1.8rem' }}>  </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>iPhone 17 Sleep Integration</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>
                On your iPhone, go to <strong>Health App → Sources → FitPulse</strong> and enable Sleep data sharing to auto-sync sleep stages, HRV, and heart rate.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
