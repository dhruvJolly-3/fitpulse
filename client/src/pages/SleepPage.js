import React, { useState, useEffect } from 'react';
import Pulse from '../components/Pulse';
import { format } from 'date-fns';
import { api, useAuth } from '../context/AuthContext';
import WeekBars from '../components/WeekBars';
import RangeToggle from '../components/RangeToggle';
import { rangeStart, dailySeries, loggedAverage } from '../utils/series';

const today = format(new Date(), 'yyyy-MM-dd');

export default function SleepPage() {
  const { user } = useAuth();
  const [log, setLog] = useState(null);
  const [form, setForm] = useState({ bedtime: '22:30', wakeTime: '06:30', quality: 4, notes: '' });
  const [saving, setSaving] = useState(false);
  const [weekLogs, setWeekLogs] = useState([]);
  const [range, setRange] = useState(7); // 7 or 30 nights of history
  const [editMode, setEditMode] = useState(false);

  const sleepTarget = user?.sleepTarget || 8;

  useEffect(() => {
    api.get(`/sleep/${today}`).then(r => { setLog(r.data); if (r.data) setEditMode(false); }).catch(() => {});
  }, []);

  // History chart: refetch whenever the 7D/30D toggle changes
  useEffect(() => {
    api.get(`/sleep/history/week?startDate=${rangeStart(range)}&days=${range}`).then(r => setWeekLogs(r.data)).catch(() => {});
  }, [range]);

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

  const weekChartData = dailySeries(weekLogs, range, 'hours', l => l.duration);

  const qualityStars = (q) => '★'.repeat(q) + '☆'.repeat(5 - q);

  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  // Average over nights that were actually logged in the selected range
  const avg7 = loggedAverage(weekChartData, 'hours').toFixed(1);

  return (
    <div className="fade-up">
      <header className="page-header">
        <div className="page-heading">
          <Pulse mood="sleep" />
          <div>
          <h1 className="page-title">Sleep</h1>
          <div className="page-date">track your recovery and sleep quality</div>
        </div>
        </div>
      </header>

      <div className="page-body">
        <div className="grid g-12">
          {/* Last night */}
          <div className="card dark span-5">
            <div className="card-h">
              <span className="label">last night</span>
              <span className={`pill ${isGood ? 'matcha' : 'coral'}`}>{isGood ? 'Well rested' : 'Below target'}</span>
            </div>
            <div className="num" style={{ fontSize: 72, lineHeight: 1 }}>
              {log?.duration || (editMode ? calcDuration(form.bedtime, form.wakeTime) : '—')}<span className="serif-it" style={{ fontSize: '0.45em', color: 'var(--matcha)' }}> hours</span>
            </div>
            {log && (
              <div className="mono" style={{ marginTop: 10, color: 'var(--matcha)', letterSpacing: '0.2em' }}>{qualityStars(log.quality || 0)}</div>
            )}

            {log && !editMode && (
              <div style={{ display: 'flex', gap: 22, alignItems: 'flex-end', marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--cream-12)', flexWrap: 'wrap' }}>
                {[
                  { label: 'Bedtime', val: fmtTime(log.bedtime) },
                  { label: 'Wake', val: fmtTime(log.wakeTime) },
                  { label: 'Target', val: `${sleepTarget}h` },
                ].map(s => (
                  <div key={s.label}>
                    <div className="label">{s.label}</div>
                    <div className="mono" style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{s.val}</div>
                  </div>
                ))}
                <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => setEditMode(true)}>Edit</button>
              </div>
            )}
          </div>

          {/* Log form */}
          {(!log || editMode) ? (
            <div className="card span-7">
              <div className="card-h"><h3>Log sleep</h3></div>
              <div className="field-row">
                <div className="field">
                  <label>Bedtime</label>
                  <input type="time" value={form.bedtime} onChange={e => setForm(p => ({ ...p, bedtime: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Wake time</label>
                  <input type="time" value={form.wakeTime} onChange={e => setForm(p => ({ ...p, wakeTime: e.target.value }))} />
                </div>
              </div>

              <div className="field">
                <span className="field-label">Sleep quality</span>
                <div className="stars">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} className={form.quality >= s ? 'on' : ''} onClick={() => setForm(p => ({ ...p, quality: s }))}>
                      {form.quality >= s ? '★' : '☆'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Notes (optional)</label>
                <input placeholder="e.g. Woke up once, vivid dreams…" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>

              <div className="kv" style={{ background: 'var(--bone)', borderRadius: 12, padding: '12px 16px', border: 'none' }}>
                <span className="k">Estimated duration</span>
                <span className="num" style={{ fontSize: 20 }}>{calcDuration(form.bedtime, form.wakeTime)}h</span>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                {editMode && <button className="btn ghost" style={{ flex: 1 }} onClick={() => setEditMode(false)}>Cancel</button>}
                <button className="btn primary" style={{ flex: 2 }} onClick={saveSleep} disabled={saving}>
                  {saving ? 'Saving…' : 'Save sleep log'}
                </button>
              </div>
            </div>
          ) : (
            <div className="span-7 grid g-2">
              {[
                { label: 'Target', val: sleepTarget, unit: 'h' },
                { label: 'Duration', val: log?.duration ?? '—', unit: log?.duration ? 'h' : '' },
                { label: 'Deficit', val: log?.duration ? Math.max(sleepTarget - log.duration, 0) : '—', unit: log?.duration ? 'h' : '', coral: log?.duration < sleepTarget },
                { label: `Avg (${range}d)`, val: avg7, unit: 'h' },
              ].map(m => (
                <div key={m.label} className="card stat-tile">
                  <div className="k">{m.label}</div>
                  <div className="v" style={{ color: m.coral ? 'var(--coral)' : undefined }}>{m.val}<span className="u">{m.unit}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weekly chart */}
        <div className="card">
          <div className="card-h">
            <div>
              <h3>{range}-night history</h3>
              <span className="label">avg {avg7}h · target {sleepTarget}h</span>
            </div>
            <RangeToggle value={range} onChange={setRange} />
          </div>
          <WeekBars data={weekChartData} xKey="day" yKey="hours" label="Sleep" target={sleepTarget}
            isToday={d => d.date === today} format={v => `${v}h`} />
        </div>
      </div>
    </div>
  );
}
