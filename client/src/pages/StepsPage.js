import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth, api } from '../context/AuthContext';

const today = format(new Date(), 'yyyy-MM-dd');

export default function StepsPage() {
  const { user } = useAuth();
  const [log, setLog] = useState(null);
  const [form, setForm] = useState({ steps: '', distance: '', caloriesBurnt: '', activeMinutes: '' });
  const [saving, setSaving] = useState(false);
  const [weekData, setWeekData] = useState([]);
  const [editMode, setEditMode] = useState(false);

  const target = user?.stepTarget || 10000;

  useEffect(() => {
    api.get(`/steps/${today}`).then(r => { setLog(r.data); if (r.data?.steps > 0) setEditMode(false); }).catch(() => {});
    const start = format(subDays(new Date(), 6), 'yyyy-MM-dd');
    api.get(`/steps/history/week?startDate=${start}`).then(r => {
      const data = Array.from({ length: 7 }, (_, i) => {
        const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
        const found = r.data.find(l => l.date === d);
        return { day: format(subDays(new Date(), 6 - i), 'EEE'), steps: found?.steps || 0 };
      });
      setWeekData(data);
    }).catch(() => {});
  }, []);

  // Auto-calculate distance and calories from steps
  const autoCalc = (steps) => {
    const s = parseInt(steps) || 0;
    return {
      distance: (s * 0.762 / 1000).toFixed(2), // avg stride ~76.2cm
      caloriesBurnt: Math.round(s * 0.04),       // ~0.04 cal/step avg
      activeMinutes: Math.round(s / 100)          // rough estimate
    };
  };

  const handleStepsChange = (e) => {
    const s = e.target.value;
    const calc = autoCalc(s);
    setForm(p => ({ ...p, steps: s, ...calc }));
  };

  const saveSteps = async () => {
    setSaving(true);
    try {
      const { data } = await api.post('/steps', {
        date: today,
        steps: +form.steps,
        distance: +form.distance,
        caloriesBurnt: +form.caloriesBurnt,
        activeMinutes: +form.activeMinutes,
      });
      setLog(data);
      setEditMode(false);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const steps = log?.steps || 0;
  const pct = Math.min(steps / target * 100, 100);
  const distance = log?.distance || 0;
  const calsBurnt = log?.caloriesBurnt || 0;

  return (
    <div className="fade-up">
      <div className="page-header">
        <h1 className="page-title">Activity</h1>
        <p className="page-subtitle">Steps, distance & calories burned</p>
      </div>

      <div className="page-body">
        {/* Big step count */}
        <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg, rgba(46,217,195,0.1), rgba(181,242,61,0.05))', borderColor: 'rgba(46,217,195,0.25)', padding: '28px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div className="card-title">Steps Today</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '3.5rem', fontWeight: 800, letterSpacing: '-0.05em', color: 'var(--teal)', lineHeight: 1 }}>
                {steps.toLocaleString()}
              </div>
              <div style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: 6 }}>
                of {target.toLocaleString()} goal
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              {/* Circular progress */}
              <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg-raised)" strokeWidth="8"/>
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--teal)" strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - pct / 100)}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }}/>
                <text x="50" y="54" textAnchor="middle" style={{ transform: 'rotate(90deg) translateX(0px) translateY(-100px)' }} />
              </svg>
              <div style={{ marginTop: -88, marginBottom: 16, textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--teal)' }}>
                {Math.round(pct)}%
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 6, background: 'var(--bg-raised)', borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--teal)', borderRadius: 3, transition: 'width 0.8s ease' }} />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid-3" style={{ marginBottom: 16 }}>
          <div className="metric-tile">
            <span className="label">Distance</span>
            <span className="value" style={{ fontSize: '1.8rem', color: 'var(--accent2)' }}>{distance.toFixed ? distance.toFixed(1) : distance}<span style={{ fontSize: '0.9rem' }}>km</span></span>
            <span className="subtext">walked today</span>
          </div>
          <div className="metric-tile">
            <span className="label">Calories Burnt</span>
            <span className="value" style={{ fontSize: '1.8rem', color: 'var(--orange)' }}>{calsBurnt}</span>
            <span className="subtext">kcal from steps</span>
          </div>
          <div className="metric-tile">
            <span className="label">Active Minutes</span>
            <span className="value" style={{ fontSize: '1.8rem', color: 'var(--teal)' }}>{log?.activeMinutes || 0}</span>
            <span className="subtext">min moving</span>
          </div>
        </div>

        {/* Log form */}
        {(!log?.steps || editMode) && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">Log Steps Manually</div>
            <div className="form-group">
              <label className="form-label">Step Count</label>
              <input type="number" placeholder="0" value={form.steps} onChange={handleStepsChange} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Distance (km)</label>
                <input type="number" step="0.01" placeholder="Auto" value={form.distance} onChange={e => setForm(p => ({ ...p, distance: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Calories Burnt</label>
                <input type="number" placeholder="Auto" value={form.caloriesBurnt} onChange={e => setForm(p => ({ ...p, caloriesBurnt: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {editMode && <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditMode(false)}>Cancel</button>}
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={saveSteps} disabled={saving || !form.steps}>
                {saving ? 'Saving…' : '💾 Save Steps'}
              </button>
            </div>
          </div>
        )}

        {log?.steps > 0 && !editMode && (
          <button className="btn btn-secondary btn-sm" style={{ marginBottom: 16 }} onClick={() => { setEditMode(true); setForm({ steps: log.steps, distance: log.distance, caloriesBurnt: log.caloriesBurnt, activeMinutes: log.activeMinutes }); }}>
            ✏️ Edit Today's Steps
          </button>
        )}

        {/* Weekly chart */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">7-Day Steps</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weekData} barCategoryGap="30%">
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={v => [v.toLocaleString(), 'Steps']} />
              <Bar dataKey="steps" radius={[4,4,0,0]}>
                {weekData.map((d, i) => (
                  <Cell key={i} fill={d.steps >= target ? '#2ed9c3' : '#2ed9c355'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Apple Health */}
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(255,45,85,0.08), rgba(46,217,195,0.08))', borderColor: 'rgba(46,217,195,0.25)' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <span style={{ fontSize: '1.8rem' }}>📱</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>Apple Fitness Integration</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginBottom: 10 }}>
                Sync steps, workouts, and calories from your iPhone 17's Motion Coprocessor and Apple Watch.
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', background: 'var(--bg-raised)', padding: '8px 12px', borderRadius: 'var(--r-sm)', lineHeight: 1.6 }}>
                iOS: Settings → Privacy → Motion & Fitness → Enable FitPulse<br/>
                Then: Health App → Sources → FitPulse → Allow All
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
