import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { useAuth, api } from '../context/AuthContext';

const today = format(new Date(), 'yyyy-MM-dd');

const AI_PROGRAMS = {
  lose_weight: {
    'non-veg': { name: 'Fat Burn Pro', daysPerWeek: 5, durationWeeks: 12,
      schedule: [
        { day: 1, label: 'HIIT Cardio', isRest: false, exercises: [
          { name: 'Jump Rope', category: 'cardio', duration: 10, sets: null, reps: null },
          { name: 'Burpees', category: 'hiit', sets: 4, reps: '15', duration: null },
          { name: 'Mountain Climbers', category: 'hiit', sets: 4, reps: '30', duration: null },
          { name: 'Box Jumps', category: 'hiit', sets: 3, reps: '12', duration: null },
          { name: 'Treadmill Run', category: 'cardio', duration: 20, sets: null, reps: null },
        ]},
        { day: 2, label: 'Upper Body Strength', isRest: false, exercises: [
          { name: 'Push-ups', category: 'strength', sets: 4, reps: '15-20', duration: null },
          { name: 'Dumbbell Row', category: 'strength', sets: 4, reps: '12', weight: '12kg' },
          { name: 'Shoulder Press', category: 'strength', sets: 3, reps: '12', weight: '10kg' },
          { name: 'Tricep Dips', category: 'strength', sets: 3, reps: '15' },
          { name: 'Plank', category: 'strength', sets: 3, reps: '60s' },
        ]},
        { day: 3, label: 'Active Recovery', isRest: true, exercises: [
          { name: 'Yoga / Stretching', category: 'flexibility', duration: 30 },
          { name: 'Light Walk', category: 'cardio', duration: 30 },
        ]},
        { day: 4, label: 'Lower Body + Core', isRest: false, exercises: [
          { name: 'Squats', category: 'strength', sets: 4, reps: '15', weight: 'Bodyweight' },
          { name: 'Lunges', category: 'strength', sets: 3, reps: '12 each' },
          { name: 'Glute Bridge', category: 'strength', sets: 4, reps: '20' },
          { name: 'Calf Raises', category: 'strength', sets: 3, reps: '25' },
          { name: 'Russian Twists', category: 'strength', sets: 3, reps: '20' },
        ]},
        { day: 5, label: 'Cardio Blast', isRest: false, exercises: [
          { name: 'Cycling', category: 'cardio', duration: 30 },
          { name: 'Rowing Machine', category: 'cardio', duration: 15 },
          { name: 'Stair Climber', category: 'cardio', duration: 15 },
        ]},
        { day: 6, label: 'Full Body Circuit', isRest: false, exercises: [
          { name: 'Kettlebell Swings', category: 'hiit', sets: 4, reps: '20' },
          { name: 'Dumbbell Deadlift', category: 'strength', sets: 3, reps: '12' },
          { name: 'Pull-ups / Assisted', category: 'strength', sets: 3, reps: '8-10' },
          { name: 'Jump Squats', category: 'hiit', sets: 3, reps: '15' },
        ]},
        { day: 7, label: 'Rest Day', isRest: true, exercises: [] },
      ]
    },
    'veg': { name: 'Lean & Green', daysPerWeek: 5, durationWeeks: 10,
      schedule: [
        { day: 1, label: 'Morning Cardio + Yoga', isRest: false, exercises: [
          { name: 'Sun Salutation', category: 'yoga', sets: 5, duration: null, reps: 'rounds' },
          { name: 'Brisk Walk / Jog', category: 'cardio', duration: 25 },
          { name: 'Core Circuit', category: 'hiit', sets: 3, reps: '15 each' },
        ]},
        { day: 2, label: 'Bodyweight Strength', isRest: false, exercises: [
          { name: 'Push-up Variations', category: 'strength', sets: 5, reps: '12' },
          { name: 'Inverted Row', category: 'strength', sets: 4, reps: '10' },
          { name: 'Pike Push-ups', category: 'strength', sets: 3, reps: '10' },
          { name: 'Hollow Hold', category: 'strength', sets: 3, reps: '30s' },
        ]},
        { day: 3, label: 'Rest + Stretch', isRest: true, exercises: [{ name: 'Full Body Stretch', category: 'flexibility', duration: 30 }] },
        { day: 4, label: 'HIIT + Lower', isRest: false, exercises: [
          { name: 'Jump Squats', category: 'hiit', sets: 4, reps: '15' },
          { name: 'Pistol Squats', category: 'strength', sets: 3, reps: '8 each' },
          { name: 'Lunge Pulses', category: 'strength', sets: 3, reps: '20' },
        ]},
        { day: 5, label: 'Cardio', isRest: false, exercises: [
          { name: 'Cycling or Swim', category: 'cardio', duration: 40 },
        ]},
        { day: 6, label: 'Power Yoga', isRest: false, exercises: [
          { name: 'Vinyasa Flow', category: 'yoga', duration: 45 },
        ]},
        { day: 7, label: 'Full Rest', isRest: true, exercises: [] },
      ]
    }
  },
  gain_muscle: {
    'non-veg': { name: 'Mass Builder Pro', daysPerWeek: 6, durationWeeks: 16,
      schedule: [
        { day: 1, label: 'Push — Chest & Triceps', isRest: false, exercises: [
          { name: 'Bench Press', category: 'strength', sets: 5, reps: '5', weight: '80% 1RM' },
          { name: 'Incline DB Press', category: 'strength', sets: 4, reps: '8-10', weight: '25kg' },
          { name: 'Cable Fly', category: 'strength', sets: 3, reps: '12' },
          { name: 'Overhead Tricep Extension', category: 'strength', sets: 4, reps: '10' },
          { name: 'Tricep Pushdown', category: 'strength', sets: 3, reps: '12' },
        ]},
        { day: 2, label: 'Pull — Back & Biceps', isRest: false, exercises: [
          { name: 'Deadlift', category: 'strength', sets: 5, reps: '5', weight: '85% 1RM' },
          { name: 'Pull-ups', category: 'strength', sets: 4, reps: '8' },
          { name: 'Barbell Row', category: 'strength', sets: 4, reps: '8' },
          { name: 'Lat Pulldown', category: 'strength', sets: 3, reps: '10' },
          { name: 'Barbell Curl', category: 'strength', sets: 4, reps: '10' },
        ]},
        { day: 3, label: 'Legs — Quads & Glutes', isRest: false, exercises: [
          { name: 'Back Squat', category: 'strength', sets: 5, reps: '5', weight: '80% 1RM' },
          { name: 'Leg Press', category: 'strength', sets: 4, reps: '10' },
          { name: 'Walking Lunges', category: 'strength', sets: 3, reps: '12 each' },
          { name: 'Leg Extension', category: 'strength', sets: 3, reps: '15' },
          { name: 'Calf Raises', category: 'strength', sets: 4, reps: '20' },
        ]},
        { day: 4, label: 'Rest / Active Recovery', isRest: true, exercises: [{ name: 'Foam Rolling + Stretch', category: 'flexibility', duration: 20 }] },
        { day: 5, label: 'Push — Shoulders', isRest: false, exercises: [
          { name: 'OHP', category: 'strength', sets: 5, reps: '5', weight: '70% 1RM' },
          { name: 'Arnold Press', category: 'strength', sets: 4, reps: '10' },
          { name: 'Lateral Raise', category: 'strength', sets: 4, reps: '15' },
          { name: 'Face Pull', category: 'strength', sets: 3, reps: '15' },
        ]},
        { day: 6, label: 'Pull + Arms', isRest: false, exercises: [
          { name: 'T-Bar Row', category: 'strength', sets: 4, reps: '8' },
          { name: 'Hammer Curl', category: 'strength', sets: 4, reps: '12' },
          { name: 'EZ Bar Curl', category: 'strength', sets: 3, reps: '10' },
          { name: 'Close Grip Bench', category: 'strength', sets: 3, reps: '10' },
        ]},
        { day: 7, label: 'Full Rest', isRest: true, exercises: [] },
      ]
    }
  }
};

export default function TrainingPage() {
  const { user } = useAuth();
  const [todayLog, setTodayLog] = useState(null);
  const [program, setProgram] = useState(null);
  const [streak, setStreak] = useState({ streak: 0, totalWorkouts: 0 });
  const [showGenerate, setShowGenerate] = useState(false);
  const [recentLogs, setRecentLogs] = useState([]);
  const [completing, setCompleting] = useState({});

  useEffect(() => {
    api.get(`/training/logs/${today}`).then(r => setTodayLog(r.data)).catch(() => {});
    api.get('/training/programs').then(r => { if (r.data.length > 0) setProgram(r.data[0]); }).catch(() => {});
    api.get('/training/streak').then(r => setStreak(r.data)).catch(() => {});
    api.get('/training/logs?limit=10').then(r => setRecentLogs(r.data)).catch(() => {});
  }, []);

  const generateProgram = async () => {
    const goal = user?.profile?.goal || 'lose_weight';
    const diet = user?.profile?.dietType || 'non-veg';
    const progData = AI_PROGRAMS[goal]?.[diet] || AI_PROGRAMS['lose_weight']['non-veg'];
    const newProg = {
      ...progData, goal, dietType: diet, active: true, generatedByAI: true,
      description: `AI-generated ${progData.name} program tailored for ${diet} diet and ${goal.replace('_', ' ')} goal`
    };
    const { data } = await api.post('/training/programs', newProg);
    setProgram(data);
    setShowGenerate(false);
  };

  const logWorkout = async (day, isRest, isOff) => {
    const exercises = day?.exercises?.map(e => ({ ...e, completed: !isRest && !isOff })) || [];
    const totalCals = isRest ? 0 : exercises.length * 50;
    const log = {
      date: today, programName: program?.name,
      dayLabel: day?.label, isRestDay: isRest, isOffDay: isOff,
      exercises, totalCaloriesBurnt: totalCals,
      totalDuration: exercises.reduce((s, e) => s + (e.duration || 5), 0),
      completedAt: new Date()
    };
    const { data } = await api.post('/training/logs', log);
    setTodayLog(data);
  };

  const toggleExercise = async (exIdx) => {
    if (!todayLog) return;
    const updated = { ...todayLog };
    updated.exercises[exIdx].completed = !updated.exercises[exIdx].completed;
    const { data } = await api.post('/training/logs', { ...updated, date: today });
    setTodayLog(data);
  };

  const todayProgDay = program?.schedule?.[((program.currentDay || 1) - 1) % program.schedule.length];
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
          <button className="btn btn-primary" onClick={() => setShowGenerate(true)}>⚡ Generate Program</button>
        </div>
      </div>

      <div className="page-body">
        {/* Stats row */}
        <div className="grid-3" style={{ marginBottom: 16 }}>
          <div className="metric-tile">
            <span className="label">Streak</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="value" style={{ color: 'var(--orange)' }}>{streak.streak}</span>
              <span style={{ fontSize: '1.5rem' }}>🔥</span>
            </div>
            <span className="subtext">days in a row</span>
          </div>
          <div className="metric-tile">
            <span className="label">Total Workouts</span>
            <span className="value" style={{ color: 'var(--accent2)' }}>{streak.totalWorkouts}</span>
            <span className="subtext">sessions logged</span>
          </div>
          <div className="metric-tile">
            <span className="label">Today's Progress</span>
            <span className="value" style={{ color: 'var(--accent)' }}>{totalCount > 0 ? Math.round(completedCount/totalCount*100) : 0}%</span>
            <span className="subtext">{completedCount}/{totalCount} exercises</span>
          </div>
        </div>

        {/* Active Program */}
        {program ? (
          <>
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', align: 'center', gap: 8, marginBottom: 6 }}>
                    <span className="badge badge-green">Active Program</span>
                    {program.generatedByAI && <span className="badge badge-blue">⚡ AI Generated</span>}
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700 }}>{program.name}</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 4 }}>{program.description}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: 'var(--text-2)' }}>
                <span>📅 {program.daysPerWeek}x/week</span>
                <span>⏱️ {program.durationWeeks} weeks</span>
                <span>🎯 {program.goal?.replace('_',' ')}</span>
                <span>🥗 {program.dietType}</span>
              </div>
            </div>

            {/* Today's Workout */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div className="card-title">Today's Session</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700 }}>
                    {todayProgDay?.label || 'Rest Day'}
                  </div>
                </div>
                {!todayLog && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {!todayProgDay?.isRest && (
                      <button className="btn btn-primary btn-sm" onClick={() => logWorkout(todayProgDay, false, false)}>
                        Start Workout
                      </button>
                    )}
                    <button className="btn btn-secondary btn-sm" onClick={() => logWorkout(todayProgDay, todayProgDay?.isRest, false)}>
                      {todayProgDay?.isRest ? 'Log Rest Day' : 'Log Day'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => logWorkout(todayProgDay, false, true)}>
                      Mark Off Day
                    </button>
                  </div>
                )}
                {todayLog && (
                  <span className={`badge ${todayLog.isOffDay ? 'badge-red' : todayLog.isRestDay ? 'badge-orange' : 'badge-green'}`}>
                    {todayLog.isOffDay ? '❌ Off Day' : todayLog.isRestDay ? '😴 Rest Day' : '✅ Logged'}
                  </span>
                )}
              </div>

              {(todayLog?.exercises || todayProgDay?.exercises || []).map((ex, i) => (
                <div key={i} className="exercise-row">
                  <div className={`exercise-check ${(todayLog?.exercises?.[i]?.completed || (!todayLog && !ex.completed)) ? '' : 'done'}`}
                    onClick={() => todayLog && toggleExercise(i)}>
                    {todayLog?.exercises?.[i]?.completed && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{ex.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                      {ex.sets && `${ex.sets} sets × `}
                      {ex.reps && `${ex.reps} reps`}
                      {ex.weight && ` @ ${ex.weight}`}
                      {ex.duration && `${ex.duration} min`}
                    </div>
                  </div>
                  <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>{ex.category}</span>
                </div>
              ))}

              {totalCount > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div className="macro-track">
                    <div className="macro-fill" style={{ width: `${completedCount/totalCount*100}%`, background: 'var(--accent)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    <span>{completedCount} done</span>
                    <span>{totalCount - completedCount} remaining</span>
                  </div>
                </div>
              )}
            </div>

            {/* Weekly schedule */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">Weekly Schedule</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {['M','T','W','T','F','S','S'].map((d, i) => {
                  const day = program.schedule?.[i];
                  return (
                    <div key={i} style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 'var(--r-md)', background: day?.isRest ? 'var(--bg-raised)' : 'var(--accent-dim)', border: `1px solid ${day?.isRest ? 'var(--border)' : 'var(--accent)'}` }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: 4 }}>{d}</div>
                      <div style={{ fontSize: '0.6rem', color: day?.isRest ? 'var(--text-3)' : 'var(--accent)', fontWeight: 600, lineClamp: 1, overflow: 'hidden', maxHeight: 24 }}>
                        {day?.isRest ? 'Rest' : '🏋️'}
                      </div>
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
              Generate an AI-tailored program based on your goal ({user?.profile?.goal?.replace('_',' ')}) and diet ({user?.profile?.dietType})
            </p>
            <button className="btn btn-primary" onClick={() => setShowGenerate(true)}>⚡ Generate My Program</button>
          </div>
        )}

        {/* Recent log */}
        {recentLogs.length > 0 && (
          <div className="card">
            <div className="card-title">Recent Activity</div>
            {recentLogs.slice(0,7).map(l => (
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

      {/* Generate Program Modal */}
      {showGenerate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowGenerate(false)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-title">⚡ Generate AI Program</div>
            <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginBottom: 20 }}>
              We'll create a custom workout plan based on your profile:
            </p>
            {[
              ['Goal', user?.profile?.goal?.replace('_', ' ')],
              ['Diet', user?.profile?.dietType],
              ['Activity Level', user?.profile?.activityLevel?.replace('_', ' ')],
              ['Current Weight', user?.profile?.weight + ' kg'],
            ].map(([k,v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{k}</span>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize' }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowGenerate(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={generateProgram}>Generate Program 🚀</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
