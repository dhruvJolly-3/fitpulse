import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { useAuth, api } from '../context/AuthContext';

const today = format(new Date(), 'yyyy-MM-dd');

// ─── FIX 1: Days-per-week & rest days are now asked from user ───
// generateProgram() now takes daysPerWeek + restDays from user input
// and builds a custom schedule instead of using hardcoded AI_PROGRAMS.

const EXERCISE_POOL = {
  lose_weight: {
    cardio:    ['Jump Rope', 'Cycling', 'Treadmill Run', 'Rowing Machine', 'Stair Climber', 'Brisk Jog'],
    hiit:      ['Burpees', 'Mountain Climbers', 'Box Jumps', 'Jump Squats', 'High Knees', 'Jumping Lunges'],
    strength:  ['Push-ups', 'Squats', 'Lunges', 'Glute Bridge', 'Plank', 'Russian Twists', 'Calf Raises', 'Tricep Dips'],
    flexibility: ['Yoga / Stretching', 'Full Body Stretch', 'Foam Rolling'],
  },
  gain_muscle: {
    push:      ['Bench Press', 'Incline DB Press', 'Overhead Press', 'Arnold Press', 'Tricep Pushdown', 'Lateral Raise'],
    pull:      ['Deadlift', 'Pull-ups', 'Barbell Row', 'Lat Pulldown', 'Barbell Curl', 'Hammer Curl'],
    legs:      ['Back Squat', 'Leg Press', 'Walking Lunges', 'Leg Extension', 'Calf Raises', 'Romanian Deadlift'],
    core:      ['Plank', 'Russian Twists', 'Hanging Knee Raises', 'Ab Wheel'],
  },
  maintain: {
    cardio:    ['Cycling', 'Brisk Walk', 'Swimming', 'Jump Rope'],
    strength:  ['Push-ups', 'Squats', 'Plank', 'Dumbbell Row', 'Shoulder Press'],
    flexibility: ['Yoga', 'Full Body Stretch'],
  },
};

const SPLIT_NAMES = {
  lose_weight: ['HIIT Cardio', 'Upper Strength', 'Cardio Blast', 'Lower Body + Core', 'Full Body Circuit', 'Active Cardio'],
  gain_muscle: ['Push — Chest & Triceps', 'Pull — Back & Biceps', 'Legs — Quads & Glutes', 'Push — Shoulders', 'Pull + Arms', 'Full Body Power'],
  maintain:    ['Full Body A', 'Cardio Session', 'Full Body B', 'Active Recovery', 'Cardio + Core', 'Mobility Flow'],
};

function buildCustomSchedule(goal, daysPerWeek, restDayIndices) {
  // restDayIndices: array of 0-6 (0=Mon) chosen by user
  const pool = EXERCISE_POOL[goal] || EXERCISE_POOL['lose_weight'];
  const splitNames = SPLIT_NAMES[goal] || SPLIT_NAMES['lose_weight'];
  const categories = Object.keys(pool);
  let workoutIdx = 0;

  return Array.from({ length: 7 }, (_, i) => {
    const isRest = restDayIndices.includes(i);
    if (isRest) {
      return {
        day: i + 1,
        label: 'Rest Day',
        isRest: true,
        exercises: [{ name: 'Light Stretching', category: 'flexibility', duration: 20 }],
      };
    }
    const splitLabel = splitNames[workoutIdx % splitNames.length];
    const cat1 = categories[workoutIdx % categories.length];
    const cat2 = categories[(workoutIdx + 1) % categories.length];
    const exPool1 = pool[cat1] || [];
    const exPool2 = pool[cat2] || [];

    const exercises = [
      ...exPool1.slice(0, 3).map(name => ({
        name, category: cat1,
        sets: cat1 === 'cardio' || cat1 === 'flexibility' ? null : 4,
        reps: cat1 === 'cardio' || cat1 === 'flexibility' ? null : '12',
        duration: cat1 === 'cardio' || cat1 === 'flexibility' ? 20 : null,
      })),
      ...exPool2.slice(0, 2).map(name => ({
        name, category: cat2,
        sets: cat2 === 'cardio' || cat2 === 'flexibility' ? null : 3,
        reps: cat2 === 'cardio' || cat2 === 'flexibility' ? null : '15',
        duration: cat2 === 'cardio' || cat2 === 'flexibility' ? 15 : null,
      })),
    ];

    workoutIdx++;
    return { day: i + 1, label: splitLabel, isRest: false, exercises };
  });
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TrainingPage() {
  const { user } = useAuth();
  const [todayLog, setTodayLog] = useState(null);
  const [program, setProgram] = useState(null);
  const [streak, setStreak] = useState({ streak: 0, totalWorkouts: 0 });
  const [showGenerate, setShowGenerate] = useState(false);
  const [recentLogs, setRecentLogs] = useState([]);

  // ─── FIX 2: Generate modal state ───
  const [genDaysPerWeek, setGenDaysPerWeek] = useState(4);
  const [genRestDays, setGenRestDays] = useState([2, 6]); // Wed + Sun default
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api.get(`/training/logs/${today}`).then(r => setTodayLog(r.data)).catch(() => {});
    api.get('/training/programs').then(r => { if (r.data.length > 0) setProgram(r.data[0]); }).catch(() => {});
    api.get('/training/streak').then(r => setStreak(r.data)).catch(() => {});
    api.get('/training/logs?limit=10').then(r => setRecentLogs(r.data)).catch(() => {});
  }, []);

  const toggleRestDay = (idx) => {
    setGenRestDays(prev => {
      if (prev.includes(idx)) return prev.filter(d => d !== idx);
      const next = [...prev, idx];
      // Ensure days worked = genDaysPerWeek
      const workDays = 7 - next.length;
      if (workDays < 1) return prev; // must have at least 1 workout day
      return next;
    });
  };

  const generateProgram = async () => {
    setGenerating(true);
    const goal = user?.profile?.goal || 'lose_weight';
    const diet = user?.profile?.dietType || 'non-veg';
    const schedule = buildCustomSchedule(goal, genDaysPerWeek, genRestDays);
    const actualWorkDays = 7 - genRestDays.length;

    const PROGRAM_NAMES = {
      lose_weight: 'Fat Burn Pro',
      gain_muscle: 'Mass Builder Pro',
      maintain: 'Maintain & Thrive',
    };

    const newProg = {
      name: PROGRAM_NAMES[goal] || 'Custom Program',
      daysPerWeek: actualWorkDays,
      durationWeeks: goal === 'gain_muscle' ? 16 : 12,
      goal, dietType: diet, active: true, generatedByAI: true,
      description: `AI-generated ${PROGRAM_NAMES[goal] || 'Custom'} program — ${actualWorkDays} days/week, tailored for ${diet} diet and ${goal.replace(/_/g, ' ')} goal`,
      schedule,
    };
    try {
      const { data } = await api.post('/training/programs', newProg);
      setProgram(data);
    } catch (e) { console.error(e); }
    setGenerating(false);
    setShowGenerate(false);
  };

  // ─── FIX 3: logWorkout logs ONLY today, not all days ───
  const logWorkout = async (day, isRest, isOff) => {
    const exercises = day?.exercises?.map(e => ({ ...e, completed: !isRest && !isOff })) || [];
    const totalCals = isRest ? 0 : exercises.length * 50;
    const log = {
      date: today,                          // ← only today's date, not whole schedule
      programName: program?.name,
      dayLabel: day?.label,
      isRestDay: isRest,
      isOffDay: isOff,
      exercises,
      totalCaloriesBurnt: totalCals,
      totalDuration: exercises.reduce((s, e) => s + (e.duration || 5), 0),
      completedAt: new Date(),
    };
    const { data } = await api.post('/training/logs', log);
    setTodayLog(data);
  };

  const toggleExercise = async (exIdx) => {
    if (!todayLog) return;
    const updated = { ...todayLog, exercises: todayLog.exercises.map((e, i) => i === exIdx ? { ...e, completed: !e.completed } : e) };
    const { data } = await api.post('/training/logs', { ...updated, date: today });
    setTodayLog(data);
  };

  // Work out which program day corresponds to today (by day-of-week, 0=Mon)
  const todayDayOfWeek = new Date().getDay(); // 0=Sun…6=Sat
  const dayIndex = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1; // convert to 0=Mon
  const todayProgDay = program?.schedule?.[dayIndex];

  const completedCount = todayLog?.exercises?.filter(e => e.completed).length || 0;
  const totalCount = todayLog?.exercises?.length || todayProgDay?.exercises?.length || 0;

  return (
    <div className="fade-up">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Training</h1>
            <p className="page-subtitle">Your AI-tailored workout program</p>
          </div>
          {/* ─── FIX 4: Button with active glow state ─── */}
          <button
            className="btn btn-primary"
            onClick={() => setShowGenerate(true)}
            style={{ position: 'relative', overflow: 'hidden' }}
          >
            <span style={{ fontSize: '1rem' }}>⚡</span> Generate Program
            <span className="btn-ripple" />
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Stats row */}
        <div className="grid-3" style={{ marginBottom: 16 }}>
          {[
            { label: 'Streak', value: streak.streak, sub: 'days in a row', color: 'var(--orange)', suffix: '🔥' },
            { label: 'Total Workouts', value: streak.totalWorkouts, sub: 'sessions logged', color: 'var(--accent2)' },
            { label: "Today's Progress", value: `${totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0}%`, sub: `${completedCount}/${totalCount} exercises`, color: 'var(--accent)' },
          ].map(({ label, value, sub, color, suffix }) => (
            <div key={label} className="metric-tile metric-tile--hover">
              <span className="label">{label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="value" style={{ color }}>{value}</span>
                {suffix && <span style={{ fontSize: '1.4rem' }}>{suffix}</span>}
              </div>
              <span className="subtext">{sub}</span>
            </div>
          ))}
        </div>

        {program ? (
          <>
            {/* Active Program card */}
            <div className="card card--accent" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span className="badge badge-green">Active Program</span>
                    {program.generatedByAI && <span className="badge badge-blue">⚡ AI Generated</span>}
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700 }}>{program.name}</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 4 }}>{program.description}</p>
                </div>
                {/* ─── FIX 5: Regenerate button ─── */}
                <button className="btn btn-ghost btn-sm" onClick={() => setShowGenerate(true)} title="Regenerate program">
                  🔄
                </button>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: 'var(--text-2)', flexWrap: 'wrap' }}>
                <span>📅 {program.daysPerWeek}x/week</span>
                <span>⏱️ {program.durationWeeks} weeks</span>
                <span>🎯 {program.goal?.replace(/_/g, ' ')}</span>
                <span>🥗 {program.dietType}</span>
              </div>
            </div>

            {/* Today's Session */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div className="card-title">Today's Session</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700 }}>
                    {todayProgDay?.label || 'Rest Day'}
                  </div>
                </div>
                {!todayLog ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {!todayProgDay?.isRest && (
                      <button className="btn btn-primary btn-sm" onClick={() => logWorkout(todayProgDay, false, false)}>
                        ▶ Start
                      </button>
                    )}
                    <button className="btn btn-secondary btn-sm" onClick={() => logWorkout(todayProgDay, todayProgDay?.isRest, false)}>
                      {todayProgDay?.isRest ? '😴 Log Rest' : '📋 Log Day'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => logWorkout(todayProgDay, false, true)}>
                      ✕ Off Day
                    </button>
                  </div>
                ) : (
                  <span className={`badge ${todayLog.isOffDay ? 'badge-red' : todayLog.isRestDay ? 'badge-orange' : 'badge-green'}`}>
                    {todayLog.isOffDay ? '❌ Off Day' : todayLog.isRestDay ? '😴 Rest' : '✅ Logged'}
                  </span>
                )}
              </div>

              {(todayLog?.exercises || todayProgDay?.exercises || []).map((ex, i) => (
                <div key={i} className="exercise-row">
                  <div
                    className={`exercise-check ${todayLog?.exercises?.[i]?.completed ? 'done' : ''}`}
                    onClick={() => todayLog && toggleExercise(i)}
                    style={{ cursor: todayLog ? 'pointer' : 'default' }}
                  >
                    {todayLog?.exercises?.[i]?.completed && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{ex.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                      {ex.sets ? `${ex.sets} sets × ` : ''}
                      {ex.reps ? `${ex.reps} reps` : ''}
                      {ex.weight ? ` @ ${ex.weight}` : ''}
                      {ex.duration ? `${ex.duration} min` : ''}
                    </div>
                  </div>
                  <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>{ex.category}</span>
                </div>
              ))}

              {totalCount > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div className="macro-track">
                    <div className="macro-fill" style={{ width: `${completedCount / totalCount * 100}%`, background: 'var(--accent)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    <span>{completedCount} done</span>
                    <span>{totalCount - completedCount} remaining</span>
                  </div>
                </div>
              )}
            </div>

            {/* Weekly Schedule */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">Weekly Schedule</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {DAY_LABELS.map((d, i) => {
                  const day = program.schedule?.[i];
                  const isToday = i === dayIndex;
                  return (
                    <div
                      key={i}
                      title={day?.label}
                      style={{
                        textAlign: 'center', padding: '8px 4px', borderRadius: 'var(--r-md)',
                        background: isToday ? 'var(--accent-dim)' : day?.isRest ? 'var(--bg-raised)' : 'rgba(91,142,255,0.08)',
                        border: `1px solid ${isToday ? 'var(--accent)' : day?.isRest ? 'var(--border)' : 'rgba(91,142,255,0.3)'}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: '0.65rem', color: isToday ? 'var(--accent)' : 'var(--text-3)', marginBottom: 4, fontWeight: isToday ? 700 : 400 }}>{d}</div>
                      <div style={{ fontSize: '0.75rem' }}>{day?.isRest ? '💤' : '🏋️'}</div>
                      {isToday && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', margin: '4px auto 0' }} />}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🏋️</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>No Active Program</h3>
            <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginBottom: 24, maxWidth: 300, margin: '0 auto 24px' }}>
              Generate an AI-tailored program based on your goal ({user?.profile?.goal?.replace(/_/g, ' ')}) and diet ({user?.profile?.dietType})
            </p>
            <button className="btn btn-primary" onClick={() => setShowGenerate(true)}>⚡ Generate My Program</button>
          </div>
        )}

        {/* Recent Logs */}
        {recentLogs.length > 0 && (
          <div className="card">
            <div className="card-title">Recent Activity</div>
            {recentLogs.slice(0, 7).map(l => (
              <div key={l._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{l.dayLabel || 'Workout'}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{l.date}</div>
                </div>
                <span className={`badge ${l.isOffDay ? 'badge-red' : l.isRestDay ? 'badge-orange' : 'badge-green'}`}>
                  {l.isOffDay ? 'Off' : l.isRestDay ? 'Rest' : `${l.totalCaloriesBurnt || 0} kcal`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Generate Program Modal — now asks user for days + rest days ─── */}
      {showGenerate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowGenerate(false)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-title">⚡ Generate AI Program</div>

            <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginBottom: 20 }}>
              Customise your schedule — we'll build the rest around your goal and diet.
            </p>

            {/* Profile summary */}
            {[
              ['Goal', user?.profile?.goal?.replace(/_/g, ' ')],
              ['Diet', user?.profile?.dietType],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>{k}</span>
                <span style={{ fontWeight: 600, fontSize: '0.82rem', textTransform: 'capitalize' }}>{v}</span>
              </div>
            ))}

            {/* Days per week slider */}
            <div style={{ marginTop: 20, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Workout Days / Week
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--accent)', fontSize: '1.1rem' }}>
                  {7 - genRestDays.length}
                </span>
              </div>
            </div>

            {/* Rest day picker */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Select your rest days
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {DAY_LABELS.map((d, i) => {
                  const isRest = genRestDays.includes(i);
                  return (
                    <button
                      key={i}
                      onClick={() => toggleRestDay(i)}
                      style={{
                        padding: '8px 4px',
                        borderRadius: 'var(--r-md)',
                        border: `1px solid ${isRest ? 'var(--border)' : 'var(--accent)'}`,
                        background: isRest ? 'var(--bg-raised)' : 'var(--accent-dim)',
                        color: isRest ? 'var(--text-3)' : 'var(--accent)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        textAlign: 'center',
                      }}
                    >
                      <div>{d}</div>
                      <div style={{ fontSize: '0.65rem', marginTop: 2 }}>{isRest ? '💤' : '🏋️'}</div>
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 8 }}>
                💡 Tap days to toggle rest / workout. Green = workout day.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowGenerate(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ flex: 2 }}
                onClick={generateProgram}
                disabled={generating || genRestDays.length >= 7}
              >
                {generating ? 'Generating…' : 'Generate Program 🚀'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
