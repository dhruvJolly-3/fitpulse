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
      description: `Auto-generated ${PROGRAM_NAMES[goal] || 'Custom'} program — ${actualWorkDays} days/week, tailored for ${diet} diet and ${goal.replace(/_/g, ' ')} goal`,
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

  const exercises = todayLog?.exercises || todayProgDay?.exercises || [];

  return (
    <div className="fade-up">
      <header className="page-header">
        <div>
          <h1 className="page-title">Training</h1>
          <div className="page-date">your tailored workout program</div>
        </div>
        <button className="btn primary" onClick={() => setShowGenerate(true)}>⚡ Generate program</button>
      </header>

      <div className="page-body">
        {/* Stats row */}
        <div className="grid g-3">
          <div className="card stat-tile">
            <div className="k">Streak</div>
            <div className="v" style={{ color: streak.streak > 0 ? 'var(--coral)' : undefined }}>{streak.streak}<span className="u">days</span></div>
            <div className="d">in a row</div>
          </div>
          <div className="card stat-tile">
            <div className="k">Total workouts</div>
            <div className="v">{streak.totalWorkouts}</div>
            <div className="d">sessions logged</div>
          </div>
          <div className="card stat-tile">
            <div className="k">Today's progress</div>
            <div className="v">{totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0}<span className="u">%</span></div>
            <div className="d">{completedCount}/{totalCount} exercises</div>
          </div>
        </div>

        {program ? (
          <>
            <div className="grid g-12">
              {/* Today's session */}
              <div className="card span-8">
                <div className="card-h" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div>
                    <span className="label">today · {format(new Date(), 'EEEE')}</span>
                    <div className="session-title">
                      {todayProgDay?.label?.split(' — ')[0] || 'Rest Day'}
                      {todayProgDay?.label?.includes(' — ') && <span className="serif-it"> · {todayProgDay.label.split(' — ')[1].toLowerCase()}</span>}
                    </div>
                  </div>
                  {!todayLog ? (
                    <div className="page-actions">
                      {!todayProgDay?.isRest && (
                        <button className="btn primary sm" onClick={() => logWorkout(todayProgDay, false, false)}>
                          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l11-7z"/></svg> Start
                        </button>
                      )}
                      <button className="btn ghost sm" onClick={() => logWorkout(todayProgDay, todayProgDay?.isRest, false)}>
                        {todayProgDay?.isRest ? 'Log rest' : 'Log day'}
                      </button>
                      <button className="btn danger sm" onClick={() => logWorkout(todayProgDay, false, true)}>
                        Off day
                      </button>
                    </div>
                  ) : (
                    <span className={`pill ${todayLog.isOffDay ? 'coral' : todayLog.isRestDay ? 'out' : 'matcha'}`}>
                      {todayLog.isOffDay ? 'Off day' : todayLog.isRestDay ? 'Rest' : 'Logged'}
                    </span>
                  )}
                </div>

                {totalCount > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0 8px' }}>
                      <span className="label">session progress</span>
                      <span className="mono" style={{ fontSize: 12 }}>{completedCount} / {totalCount} done</span>
                    </div>
                    <div className="bar lime" style={{ marginBottom: 20 }}><i style={{ width: `${completedCount / totalCount * 100}%` }} /></div>
                  </>
                )}

                {exercises.map((ex, i) => {
                  const done = todayLog?.exercises?.[i]?.completed;
                  return (
                    <div key={i} className={`exo ${done ? 'done' : ''} ${todayLog ? 'clickable' : ''}`}
                      onClick={() => todayLog && toggleExercise(i)}>
                      <div className="check">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4 10-11"/></svg>
                      </div>
                      <div>
                        <div className="nm">{ex.name}</div>
                        <div className="meta">
                          {ex.sets ? `${ex.sets} sets × ` : ''}
                          {ex.reps ? `${ex.reps} reps` : ''}
                          {ex.weight ? ` @ ${ex.weight}` : ''}
                          {ex.duration ? `${ex.duration} min` : ''}
                        </div>
                      </div>
                      <span className="pill out end">{ex.category}</span>
                    </div>
                  );
                })}
              </div>

              {/* Program + weekly schedule */}
              <div className="span-4 stack">
                <div className="card dark">
                  <div className="chips" style={{ marginBottom: 12 }}>
                    <span className="pill matcha">Active program</span>
                    {program.generatedByAI && <span className="pill out">Auto-generated</span>}
                  </div>
                  <div className="num" style={{ fontSize: 26, lineHeight: 1.05 }}>{program.name}</div>
                  <p style={{ fontSize: 12.5, color: 'var(--cream-50)', marginTop: 8, lineHeight: 1.5 }}>{program.description}</p>
                  <div className="mono" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 16, fontSize: 11, color: 'var(--cream-60)' }}>
                    <span>{program.daysPerWeek}x/week</span>
                    <span>{program.durationWeeks} weeks</span>
                    <span style={{ textTransform: 'capitalize' }}>{program.goal?.replace(/_/g, ' ')}</span>
                    <span>{program.dietType}</span>
                  </div>
                  <button className="btn ghost sm" style={{ marginTop: 18 }} onClick={() => setShowGenerate(true)}>Regenerate</button>
                </div>

                <div className="card">
                  <div className="card-h"><h3>Weekly schedule</h3></div>
                  <div className="dow-row">
                    {DAY_LABELS.map((d, i) => <span key={d} className={i === dayIndex ? 'today' : ''}>{d}</span>)}
                  </div>
                  <div className="heatmap">
                    {DAY_LABELS.map((d, i) => {
                      const day = program.schedule?.[i];
                      return (
                        <div key={d} title={day?.label} className={`cell ${day?.isRest ? '' : 'l3'} ${i === dayIndex ? 'today' : ''}`} />
                      );
                    })}
                  </div>
                  <div className="heatmap-legend">
                    <span><i style={{ background: 'var(--matcha)' }} />workout</span>
                    <span><i style={{ background: 'var(--ink-08)' }} />rest</span>
                    <span><i style={{ boxShadow: 'inset 0 0 0 2px var(--coral)' }} />today</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="card empty">
            <div className="ic">🏋️</div>
            <h3>No active <span className="serif-it">program</span></h3>
            <p>Generate a program based on your goal ({user?.profile?.goal?.replace(/_/g, ' ')}) and diet ({user?.profile?.dietType}).</p>
            <button className="btn primary" onClick={() => setShowGenerate(true)}>⚡ Generate my program</button>
          </div>
        )}

        {/* Recent Logs */}
        {recentLogs.length > 0 && (
          <div className="card">
            <div className="card-h"><h3>Recent activity</h3><span className="label">last {Math.min(recentLogs.length, 7)} sessions</span></div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Session</th><th>Date</th><th>Result</th></tr></thead>
                <tbody>
                  {recentLogs.slice(0, 7).map(l => (
                    <tr key={l._id}>
                      <td>{l.dayLabel || 'Workout'}</td>
                      <td className="mono">{l.date}</td>
                      <td>
                        <span className={`pill ${l.isOffDay ? 'coral' : l.isRestDay ? 'out' : 'matcha'}`}>
                          {l.isOffDay ? 'Off' : l.isRestDay ? 'Rest' : `${l.totalCaloriesBurnt || 0} kcal`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Generate Program Modal — asks user for rest days */}
      {showGenerate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowGenerate(false)}>
          <div className="modal">
            <div className="modal-head">
              <div className="modal-title">Generate <span className="serif-it">program</span></div>
              <button className="icon-btn" onClick={() => setShowGenerate(false)} title="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <p className="muted" style={{ marginBottom: 16 }}>
              Customise your schedule — we'll build the rest around your goal and diet.
            </p>

            {[
              ['Goal', user?.profile?.goal?.replace(/_/g, ' ')],
              ['Diet', user?.profile?.dietType],
            ].map(([k, v]) => (
              <div key={k} className="kv"><span className="k">{k}</span><span className="v">{v}</span></div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '22px 0 10px' }}>
              <span className="field-label">Workout days / week</span>
              <span className="num" style={{ fontSize: 28 }}>{7 - genRestDays.length}</span>
            </div>

            <span className="field-label">Tap to toggle rest days</span>
            <div className="heatmap" style={{ marginTop: 10 }}>
              {DAY_LABELS.map((d, i) => {
                const isRest = genRestDays.includes(i);
                return (
                  <button key={i} onClick={() => toggleRestDay(i)} className={`cell ${isRest ? '' : 'l3'}`}
                    style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700 }}>
                    {d}
                  </button>
                );
              })}
            </div>
            <div className="heatmap-legend" style={{ marginBottom: 22 }}>
              <span><i style={{ background: 'var(--matcha)' }} />workout</span>
              <span><i style={{ background: 'var(--ink-08)' }} />rest</span>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn ghost" style={{ flex: 1 }} onClick={() => setShowGenerate(false)}>Cancel</button>
              <button
                className="btn primary"
                style={{ flex: 2 }}
                onClick={generateProgram}
                disabled={generating || genRestDays.length >= 7}
              >
                {generating ? 'Generating…' : 'Generate program'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
