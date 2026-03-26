import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { useAuth, api } from '../context/AuthContext';

const today = format(new Date(), 'yyyy-MM-dd');

function ProgressRing({ value, max, color, size = 80, stroke = 8, children }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const offset = circ - pct * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-raised)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}

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
    <div style={{ padding: 32, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div style={{ color: 'var(--text-3)' }}>Loading your stats…</div>
    </div>
  );

  return (
    <div className="fade-up">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 4 }}>
              {format(new Date(), 'EEEE, MMMM d')}
            </div>
            <h1 className="page-title">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="page-subtitle">Here's your health snapshot for today</p>
          </div>
          {streak > 0 && (
            <div className="streak-badge">
              🔥 {streak} day streak
            </div>
          )}
        </div>
      </div>

      <div className="page-body">
        {/* Apple Health Banner */}
        <div className="apple-health-banner" style={{ cursor: 'pointer' }} onClick={() => navigate('/steps')}>
          <div style={{ fontSize: '1.5rem' }}>  </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 }}>Apple Health Integration</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>Sync steps, sleep & heart rate from your iPhone 17 via HealthKit API</div>
          </div>
          <div style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Set up →</div>
        </div>

        {/* Calorie Ring + Macros */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 16 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '24px 16px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Calories Today</div>
            <ProgressRing value={calConsumed} max={calTarget} color="var(--accent)" size={120} stroke={10}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>{calConsumed}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>/ {calTarget}</div>
              </div>
            </ProgressRing>
            <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--text-3)' }}>Burnt</div>
                <div style={{ fontWeight: 700, color: 'var(--orange)' }}>{calBurnt}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--text-3)' }}>Net</div>
                <div style={{ fontWeight: 700, color: calNet > calTarget ? 'var(--red)' : 'var(--accent)' }}>{calNet}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Macros</div>
            <div className="macro-bar-wrap">
              {[
                { label: 'Protein', cur: nutrition?.totals?.protein || 0, max: user?.macroTargets?.protein || 150, color: '#5b8eff' },
                { label: 'Carbs', cur: nutrition?.totals?.carbs || 0, max: user?.macroTargets?.carbs || 250, color: '#b5f23d' },
                { label: 'Fat', cur: nutrition?.totals?.fat || 0, max: user?.macroTargets?.fat || 65, color: '#ff9f43' },
              ].map(m => (
                <div key={m.label} className="macro-bar">
                  <div className="macro-bar-header">
                    <span className="mname">{m.label}</span>
                    <span className="mval">{Math.round(m.cur)}g / {m.max}g</span>
                  </div>
                  <div className="macro-track">
                    <div className="macro-fill" style={{ width: `${Math.min(m.cur / m.max * 100, 100)}%`, background: m.color }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="divider" />
            <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={() => navigate('/nutrition')}>
              + Log Food
            </button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid-4" style={{ marginBottom: 16 }}>
          {/* Water */}
          <div className="metric-tile" style={{ cursor: 'pointer' }} onClick={() => navigate('/water')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="label">Hydration</span>
              <span style={{ fontSize: '1.2rem' }}>💧</span>
            </div>
            <ProgressRing value={waterTotal} max={waterTarget} color="var(--accent2)" size={64} stroke={6}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent2)' }}>{Math.round(waterTotal/waterTarget*100)}%</span>
            </ProgressRing>
            <div className="value" style={{ fontSize: '1.4rem' }}>{(waterTotal/1000).toFixed(1)}L</div>
            <div className="subtext">of {(waterTarget/1000).toFixed(1)}L goal</div>
          </div>

          {/* Steps */}
          <div className="metric-tile" style={{ cursor: 'pointer' }} onClick={() => navigate('/steps')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="label">Steps</span>
              <span style={{ fontSize: '1.2rem' }}>👟</span>
            </div>
            <ProgressRing value={stepsCount} max={stepsTarget} color="var(--teal)" size={64} stroke={6}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--teal)' }}>{Math.round(stepsCount/stepsTarget*100)}%</span>
            </ProgressRing>
            <div className="value" style={{ fontSize: '1.4rem' }}>{stepsCount.toLocaleString()}</div>
            <div className="subtext">of {stepsTarget.toLocaleString()} goal</div>
          </div>

          {/* Sleep */}
          <div className="metric-tile" style={{ cursor: 'pointer' }} onClick={() => navigate('/sleep')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="label">Sleep</span>
              <span style={{ fontSize: '1.2rem' }}>🌙</span>
            </div>
            <ProgressRing value={sleepHours} max={sleepTarget} color="var(--purple)" size={64} stroke={6}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--purple)' }}>{sleepHours}h</span>
            </ProgressRing>
            <div className="value" style={{ fontSize: '1.4rem' }}>{sleepHours}<span style={{ fontSize: '1rem' }}>h</span></div>
            <div className="subtext">of {sleepTarget}h target</div>
          </div>

          {/* TDEE */}
          <div className="metric-tile">
            <span className="label">TDEE</span>
            <div className="value" style={{ fontSize: '1.6rem', color: 'var(--orange)' }}>{user?.tdee || '—'}</div>
            <div className="subtext">kcal/day maintenance</div>
            <div className="divider" />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
              Target: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{calTarget} kcal</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-title">Quick Log</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: '+ Meal', icon: '🍽️', path: '/nutrition' },
              { label: '+ Water', icon: '💧', path: '/water' },
              { label: '+ Workout', icon: '🏋️', path: '/training' },
              { label: '+ Sleep', icon: '😴', path: '/sleep' },
              { label: '+ Steps', icon: '👟', path: '/steps' },
            ].map(a => (
              <button key={a.label} className="btn btn-secondary btn-sm" onClick={() => navigate(a.path)}
                style={{ gap: 6 }}>
                <span>{a.icon}</span>{a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
