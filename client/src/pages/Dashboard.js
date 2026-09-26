import React, { useState, useEffect } from 'react';
import Pulse from '../components/Pulse';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth, api } from '../context/AuthContext';
import Ring from '../components/Ring';

const today = format(new Date(), 'yyyy-MM-dd');

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nutrition, setNutrition] = useState(null);
  const [water, setWater] = useState(null);
  const [steps, setSteps] = useState(null);
  const [sleep, setSleep] = useState(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/nutrition/${today}`).catch(() => null),
      api.get(`/water/${today}`).catch(() => null),
      api.get(`/steps/${today}`).catch(() => null),
      api.get(`/sleep/${today}`).catch(() => null),
      api.get('/training/streak').catch(() => null),
    ]).then(([n, w, s, sl, st]) => {
      setNutrition(n?.data);
      setWater(w?.data);
      setSteps(s?.data);
      setSleep(sl?.data);
      setStreak(st?.data?.streak || 0);
    }).finally(() => setLoading(false));
  }, []);

  const calTarget = user?.dailyCalorieTarget || 2000;
  const calConsumed = nutrition?.totals?.calories || 0;
  const calBurnt = (steps?.caloriesBurnt || 0);
  const calNet = calConsumed - calBurnt;
  const waterTotal = water?.total || 0;
  const waterTarget = user?.waterTarget || 2500;
  const stepsCount = steps?.steps || 0;
  const stepsTarget = user?.stepTarget || 10000;
  const sleepHours = sleep?.duration || 0;
  const sleepTarget = user?.sleepTarget || 8;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return (
    <div className="center-screen" style={{ minHeight: '60vh' }}>
      <span className="label">Loading your stats…</span>
    </div>
  );

  const pct = (cur, max) => `${Math.min(max > 0 ? cur / max * 100 : 0, 100)}%`;

  const macros = [
    { label: 'Protein', cur: nutrition?.totals?.protein || 0, max: user?.macroTargets?.protein || 150, bar: 'lime' },
    { label: 'Carbs', cur: nutrition?.totals?.carbs || 0, max: user?.macroTargets?.carbs || 250, bar: 'ink' },
    { label: 'Fat', cur: nutrition?.totals?.fat || 0, max: user?.macroTargets?.fat || 65, bar: '' },
  ];

  return (
    <div className="fade-up">
      <header className="page-header">
        <div className="page-heading">
          <Pulse mood="wave" />
          <div>
          <h1 className="page-title">{greeting}, <span className="serif-it">{user?.name?.split(' ')[0]}</span></h1>
          <div className="page-date">{format(new Date(), 'EEEE · MMMM d')}</div>
        </div>
        </div>
        {streak > 0 && <span className="pill coral">🔥 {streak} day streak</span>}
      </header>

      <div className="page-body">
        <div className="grid g-12">
          {/* Calorie ring */}
          <div className="card lime span-4 ring-card">
            <Ring value={calConsumed} max={calTarget}>
              <div className="big">{calConsumed}</div>
              <div className="sub">kcal eaten</div>
            </Ring>
            <div className="ring-foot">
              / {calTarget.toLocaleString()} goal · burnt <b>{calBurnt}</b> · net <b style={{ color: calNet > calTarget ? 'var(--coral)' : undefined }}>{calNet}</b>
            </div>
          </div>

          {/* Macros */}
          <div className="card span-4">
            <div className="card-h"><h3>Macros today</h3><span className="pill out">grams</span></div>
            <div className="macro-row">
              {macros.map(m => (
                <div key={m.label} className="macro">
                  <div className="k">{m.label}</div>
                  <div className="v">{Math.round(m.cur)}<span className="u">g</span></div>
                  <div className="t">/ {m.max}g</div>
                  <div className={`bar ${m.bar}`}><i style={{ width: pct(m.cur, m.max) }} /></div>
                </div>
              ))}
            </div>
            <button className="btn ghost sm block" style={{ marginTop: 18 }} onClick={() => navigate('/nutrition')}>
              + Log food
            </button>
          </div>

          {/* TDEE */}
          <div className="card dark span-4 stat-tile">
            <div className="k">TDEE · maintenance</div>
            <div className="v">{user?.tdee || '—'}<span className="u">kcal/day</span></div>
            <div className="d">Daily target <b style={{ color: 'var(--matcha)' }}>{calTarget} kcal</b> for your {user?.profile?.goal?.replace('_', ' ')} goal</div>
            <button className="btn lime sm" style={{ marginTop: 22 }} onClick={() => navigate('/profile')}>Adjust goals →</button>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid g-3">
          <div className="card stat-tile clickable" onClick={() => navigate('/water')}>
            <div className="k">Hydration <span>💧</span></div>
            <div className="v">{(waterTotal / 1000).toFixed(1)}<span className="u">L</span></div>
            <div className="bar lime"><i style={{ width: pct(waterTotal, waterTarget) }} /></div>
            <div className="d">{Math.round(waterTotal / waterTarget * 100)}% of {(waterTarget / 1000).toFixed(1)}L goal</div>
          </div>

          <div className="card stat-tile clickable" onClick={() => navigate('/steps')}>
            <div className="k">Steps <span>👟</span></div>
            <div className="v">{stepsCount.toLocaleString()}</div>
            <div className="bar ink"><i style={{ width: pct(stepsCount, stepsTarget) }} /></div>
            <div className="d">{Math.round(stepsCount / stepsTarget * 100)}% of {stepsTarget.toLocaleString()} goal</div>
          </div>

          <div className="card stat-tile clickable" onClick={() => navigate('/sleep')}>
            <div className="k">Sleep <span>🌙</span></div>
            <div className="v">{sleepHours}<span className="u">h</span></div>
            <div className={`bar ${sleepHours >= sleepTarget ? 'lime' : ''}`}><i style={{ width: pct(sleepHours, sleepTarget) }} /></div>
            <div className="d">of {sleepTarget}h target</div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="card">
          <div className="card-h"><h3>Quick log</h3></div>
          <div className="chips">
            {[
              { label: '+ Meal', icon: '🍽️', path: '/nutrition' },
              { label: '+ Water', icon: '💧', path: '/water' },
              { label: '+ Workout', icon: '🏋️', path: '/training' },
              { label: '+ Sleep', icon: '😴', path: '/sleep' },
              { label: '+ Steps', icon: '👟', path: '/steps' },
            ].map(a => (
              <button key={a.label} className="btn ghost sm" onClick={() => navigate(a.path)}>
                <span>{a.icon}</span>{a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
