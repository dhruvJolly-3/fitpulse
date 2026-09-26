import React, { useState, useEffect } from 'react';
import Pulse from '../components/Pulse';
import { format } from 'date-fns';
import { useAuth, api } from '../context/AuthContext';
import Ring from '../components/Ring';
import WeekBars from '../components/WeekBars';
import RangeToggle from '../components/RangeToggle';
import { rangeStart, dailySeries, loggedAverage } from '../utils/series';

const today = format(new Date(), 'yyyy-MM-dd');

export default function StepsPage() {
  const { user } = useAuth();
  const [log, setLog] = useState(null);
  // ─── FIX: form stores raw strings, never a prefilled number ───
  const [form, setForm] = useState({ steps: '', distance: '', caloriesBurnt: '', activeMinutes: '' });
  const [saving, setSaving] = useState(false);
  const [weekData, setWeekData] = useState([]);
  const [range, setRange] = useState(7); // 7 or 30 days of history
  const [editMode, setEditMode] = useState(false);
  // ─── FIX: track which fields were manually edited by user ───
  const [manualFields, setManualFields] = useState({ distance: false, caloriesBurnt: false });

  const target = user?.stepTarget || 10000;

  useEffect(() => {
    api.get(`/steps/${today}`)
      .then(r => { setLog(r.data); if (r.data?.steps > 0) setEditMode(false); })
      .catch(() => {});
  }, []);

  // History chart: refetch whenever the 7D/30D toggle changes
  useEffect(() => {
    api.get(`/steps/history/week?startDate=${rangeStart(range)}&days=${range}`)
      .then(r => setWeekData(dailySeries(r.data, range, 'steps', l => l.steps)))
      .catch(() => {});
  }, [range]);

  const autoCalc = (steps) => {
    const s = parseInt(steps) || 0;
    return {
      distance: s > 0 ? (s * 0.762 / 1000).toFixed(2) : '',
      caloriesBurnt: s > 0 ? String(Math.round(s * 0.04)) : '',
      activeMinutes: s > 0 ? String(Math.round(s / 100)) : '',
    };
  };

  // ─── FIX: steps input handler — no prepended zeros, clean value ───
  const handleStepsChange = (e) => {
    // Remove leading zeros: "06000" → "6000"
    const raw = e.target.value.replace(/^0+(?=\d)/, '');
    const calc = autoCalc(raw);
    setForm(prev => ({
      steps: raw,
      distance: manualFields.distance ? prev.distance : calc.distance,
      caloriesBurnt: manualFields.caloriesBurnt ? prev.caloriesBurnt : calc.caloriesBurnt,
      activeMinutes: calc.activeMinutes,
    }));
  };

  const saveSteps = async () => {
    setSaving(true);
    try {
      const { data } = await api.post('/steps', {
        date: today,
        steps: parseInt(form.steps) || 0,
        distance: parseFloat(form.distance) || 0,
        caloriesBurnt: parseInt(form.caloriesBurnt) || 0,
        activeMinutes: parseInt(form.activeMinutes) || 0,
      });
      setLog(data);
      setEditMode(false);
      setManualFields({ distance: false, caloriesBurnt: false });
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const steps = log?.steps || 0;
  const pct = Math.min(steps / target * 100, 100);
  const distance = log?.distance || 0;
  const calsBurnt = log?.caloriesBurnt || 0;

  const startEdit = () => {
    setEditMode(true);
    setForm({
      steps: String(log.steps),
      distance: String(log.distance || ''),
      caloriesBurnt: String(log.caloriesBurnt || ''),
      activeMinutes: String(log.activeMinutes || ''),
    });
  };

  return (
    <div className="fade-up">
      <header className="page-header">
        <div className="page-heading">
          <Pulse mood="run" />
          <div>
          <h1 className="page-title">Activity</h1>
          <div className="page-date">steps, distance &amp; calories burned</div>
        </div>
        </div>
        {log?.steps > 0 && !editMode && (
          <button className="btn ghost sm" onClick={startEdit}>Edit today's steps</button>
        )}
      </header>

      <div className="page-body">
        <div className="grid g-12">
          {/* Steps hero */}
          <div className="card lime span-7" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <span className="label" style={{ color: 'var(--ink-70)' }}>steps today</span>
              <div className="num" style={{ fontSize: 76, lineHeight: 0.95, marginTop: 8 }}>{steps.toLocaleString()}</div>
              <div className="mono" style={{ fontSize: 12, marginTop: 10, color: 'var(--ink-70)' }}>of {target.toLocaleString()} goal</div>
            </div>
            <Ring value={steps} max={target} size={132} stroke={13}>
              <div className="num" style={{ fontSize: 26 }}>{Math.round(pct)}%</div>
            </Ring>
          </div>

          {/* Stats */}
          <div className="span-5 stack">
            <div className="card stat-tile">
              <div className="k">Distance</div>
              <div className="v">{typeof distance === 'number' ? distance.toFixed(1) : distance}<span className="u">km</span></div>
            </div>
            <div className="grid g-2">
              <div className="card stat-tile">
                <div className="k">Burnt</div>
                <div className="v" style={{ fontSize: 30 }}>{calsBurnt}<span className="u">kcal</span></div>
              </div>
              <div className="card stat-tile">
                <div className="k">Active</div>
                <div className="v" style={{ fontSize: 30 }}>{log?.activeMinutes || 0}<span className="u">min</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Log form */}
        {(!log?.steps || editMode) && (
          <div className="card">
            <div className="card-h"><h3>Log steps manually</h3></div>

            <div className="field">
              <label>Step count</label>
              <div className="input-affix">
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="e.g. 8000"
                  value={form.steps}
                  onChange={handleStepsChange}
                  // Select-all on focus so typing replaces the value instead of prepending
                  onFocus={e => e.target.select()}
                />
                <span>steps</span>
              </div>
              <span className="hint">Distance &amp; calories will auto-calculate</span>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Distance (km)</label>
                <div className="input-affix">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={form.steps ? `~${autoCalc(form.steps).distance}` : 'Auto-calculated'}
                    value={form.distance}
                    onFocus={e => e.target.select()}
                    onChange={e => {
                      setManualFields(p => ({ ...p, distance: true }));
                      setForm(p => ({ ...p, distance: e.target.value }));
                    }}
                  />
                  <span>km</span>
                </div>
              </div>
              <div className="field">
                <label>Calories burnt</label>
                <div className="input-affix">
                  <input
                    type="number"
                    min="0"
                    placeholder={form.steps ? `~${autoCalc(form.steps).caloriesBurnt}` : 'Auto-calculated'}
                    value={form.caloriesBurnt}
                    onFocus={e => e.target.select()}
                    onChange={e => {
                      setManualFields(p => ({ ...p, caloriesBurnt: true }));
                      setForm(p => ({ ...p, caloriesBurnt: e.target.value }));
                    }}
                  />
                  <span>kcal</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {editMode && (
                <button className="btn ghost" style={{ flex: 1 }} onClick={() => {
                  setEditMode(false);
                  setManualFields({ distance: false, caloriesBurnt: false });
                }}>Cancel</button>
              )}
              <button
                className="btn primary"
                style={{ flex: 2 }}
                onClick={saveSteps}
                disabled={saving || !form.steps || parseInt(form.steps) <= 0}
              >
                {saving ? 'Saving…' : 'Save steps'}
              </button>
            </div>
          </div>
        )}

        {/* History chart (7 or 30 days) */}
        <div className="card">
          <div className="card-h">
            <div>
              <h3>{range}-day steps</h3>
              <span className="label">goal {target.toLocaleString()} · avg {Math.round(loggedAverage(weekData, 'steps')).toLocaleString()}</span>
            </div>
            <RangeToggle value={range} onChange={setRange} />
          </div>
          <WeekBars data={weekData} xKey="day" yKey="steps" label="Steps" target={target}
            isToday={d => d.date === today} format={v => v.toLocaleString()} />
        </div>
      </div>
    </div>
  );
}
