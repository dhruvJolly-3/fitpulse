import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';

const STEPS = ['Body Stats', 'Your Goal', 'Diet & Activity', 'Review'];

export default function OnboardingPage() {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    age: '', gender: 'male', height: '', weight: '', targetWeight: '',
    goal: 'lose_weight', dietType: 'non-veg', activityLevel: 'moderately_active'
  });

  const set = k => e => setData(p => ({ ...p, [k]: e.target.value }));

  const finish = async () => {
    setSaving(true);
    try {
      const { data: updated } = await api.put('/user/profile', { profile: data });
      updateUser(updated);
      navigate('/');
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const goals = [
    { v: 'lose_weight', label: 'Lose Weight', icon: '📉', desc: 'Caloric deficit + cardio focus' },
    { v: 'maintain', label: 'Stay Fit', icon: '⚖️', desc: 'Maintain current physique' },
    { v: 'gain_muscle', label: 'Build Muscle', icon: '💪', desc: 'Caloric surplus + strength' },
    { v: 'endurance', label: 'Endurance', icon: '🏃', desc: 'Cardio & stamina focus' },
  ];

  const diets = [
    { v: 'non-veg', label: 'Non-Veg', icon: '🥩' },
    { v: 'veg', label: 'Vegetarian', icon: '🥦' },
    { v: 'vegan', label: 'Vegan', icon: '🌱' },
    { v: 'keto', label: 'Keto', icon: '🥑' },
    { v: 'paleo', label: 'Paleo', icon: '🍖' },
  ];

  const activities = [
    { v: 'sedentary', label: 'Sedentary', desc: 'Desk job, no exercise' },
    { v: 'lightly_active', label: 'Light', desc: '1-3 days/week' },
    { v: 'moderately_active', label: 'Moderate', desc: '3-5 days/week' },
    { v: 'very_active', label: 'Very Active', desc: '6-7 days/week' },
    { v: 'extra_active', label: 'Athlete', desc: '2x/day training' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Let's set up your profile</h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: 6 }}>Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: 'var(--bg-raised)', borderRadius: 2, marginBottom: 32, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--accent)', width: `${((step + 1) / STEPS.length) * 100}%`, transition: 'width 0.4s ease', borderRadius: 2 }} />
        </div>

        <div className="card" style={{ padding: '28px 24px' }}>
          {/* Step 0 - Body Stats */}
          {step === 0 && (
            <div className="fade-up">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input type="number" placeholder="25" value={data.age} onChange={set('age')} min={13} max={100} />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select value={data.gender} onChange={set('gender')}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Height (cm)</label>
                  <input type="number" placeholder="175" value={data.height} onChange={set('height')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Weight (kg)</label>
                  <input type="number" placeholder="70" value={data.weight} onChange={set('weight')} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Target Weight (kg)</label>
                <input type="number" placeholder="65" value={data.targetWeight} onChange={set('targetWeight')} />
              </div>
            </div>
          )}

          {/* Step 1 - Goal */}
          {step === 1 && (
            <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {goals.map(g => (
                <div key={g.v} onClick={() => setData(p => ({ ...p, goal: g.v }))}
                  style={{ padding: '16px', borderRadius: 'var(--r-lg)', border: `1px solid ${data.goal === g.v ? 'var(--accent)' : 'var(--border)'}`, background: data.goal === g.v ? 'var(--accent-dim)' : 'var(--bg-raised)', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>{g.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{g.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{g.desc}</div>
                </div>
              ))}
            </div>
          )}

          {/* Step 2 - Diet & Activity */}
          {step === 2 && (
            <div className="fade-up">
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Diet Type</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                  {diets.map(d => (
                    <button key={d.v} onClick={() => setData(p => ({ ...p, dietType: d.v }))}
                      style={{ padding: '8px 14px', borderRadius: 'var(--r-pill)', border: `1px solid ${data.dietType === d.v ? 'var(--accent)' : 'var(--border)'}`, background: data.dietType === d.v ? 'var(--accent-dim)' : 'transparent', color: data.dietType === d.v ? 'var(--accent)' : 'var(--text-2)', fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {d.icon} {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Activity Level</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                  {activities.map(a => (
                    <div key={a.v} onClick={() => setData(p => ({ ...p, activityLevel: a.v }))}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 'var(--r-md)', border: `1px solid ${data.activityLevel === a.v ? 'var(--accent)' : 'var(--border)'}`, background: data.activityLevel === a.v ? 'var(--accent-dim)' : 'var(--bg-raised)', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{a.label}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{a.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3 - Review */}
          {step === 3 && (
            <div className="fade-up">
              <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginBottom: 20 }}>Here's your profile summary. We'll calculate your TDEE and set your daily targets.</p>
              {[
                ['Age', data.age + ' years'],
                ['Gender', data.gender],
                ['Height', data.height + ' cm'],
                ['Weight', data.weight + ' kg'],
                ['Target Weight', data.targetWeight + ' kg'],
                ['Goal', data.goal.replace('_', ' ')],
                ['Diet', data.dietType],
                ['Activity', data.activityLevel.replace('_', ' ')],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{k}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          {step > 0 && (
            <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)} style={{ flex: 1 }}>
              ← Back
            </button>
          )}
          <button className="btn btn-primary" onClick={step < STEPS.length - 1 ? () => setStep(s => s + 1) : finish}
            disabled={saving} style={{ flex: 2 }}>
            {step < STEPS.length - 1 ? 'Continue →' : saving ? 'Setting up…' : 'Launch FitPulse 🚀'}
          </button>
        </div>
      </div>
    </div>
  );
}
