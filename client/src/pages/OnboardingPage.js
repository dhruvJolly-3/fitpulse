import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';

const STEPS = ['Body Stats', 'Your Goal', 'Diet & Activity', 'Review'];

export default function OnboardingPage() {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    age: '', gender: 'male', height: '', weight: '', targetWeight: '',
    goal: 'lose_weight', dietType: 'non-veg', activityLevel: 'moderately_active'
  });

  const set = k => e => setData(p => ({ ...p, [k]: e.target.value }));

  const finish = async () => {
    setSaving(true);
    setError('');
    try {
      const { data: updated } = await api.put('/user/profile', { profile: data });
      updateUser(updated);
      navigate('/');
    } catch (e) {
      // Server-side validation message, e.g. "Age must be between 13 and 100"
      setError(e.response?.data?.message || 'Could not save your profile');
    }
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
    <div className="onboard fade-up">
      <div className="brand">
        <div className="brand-mark">F</div>
        <span className="brand-name">FitPulse<b>.</b></span>
      </div>

      <span className="label">Step {step + 1} of {STEPS.length} · {STEPS[step]}</span>
      <h1>let's set up your <span className="serif-it">profile</span></h1>

      <div className="bar lime" style={{ marginBottom: 22 }}>
        <i style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      <div className="card">
        {/* Step 0 - Body Stats */}
        {step === 0 && (
          <div className="fade-up">
            <div className="field-row">
              <div className="field">
                <label>Age</label>
                <input type="number" placeholder="25" value={data.age} onChange={set('age')} min={13} max={100} />
              </div>
              <div className="field">
                <label>Gender</label>
                <select value={data.gender} onChange={set('gender')}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Height (cm)</label>
                <input type="number" placeholder="175" value={data.height} onChange={set('height')} />
              </div>
              <div className="field">
                <label>Weight (kg)</label>
                <input type="number" placeholder="70" value={data.weight} onChange={set('weight')} />
              </div>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Target weight (kg)</label>
              <input type="number" placeholder="65" value={data.targetWeight} onChange={set('targetWeight')} />
            </div>
          </div>
        )}

        {/* Step 1 - Goal */}
        {step === 1 && (
          <div className="options g-2 fade-up">
            {goals.map(g => (
              <button key={g.v} type="button" className={`option ${data.goal === g.v ? 'on' : ''}`}
                onClick={() => setData(p => ({ ...p, goal: g.v }))}>
                <span className="ic">{g.icon}</span>
                <span className="t">{g.label}</span>
                <span className="s">{g.desc}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2 - Diet & Activity */}
        {step === 2 && (
          <div className="fade-up">
            <div className="field" style={{ marginBottom: 22 }}>
              <span className="field-label">Diet type</span>
              <div className="chips">
                {diets.map(d => (
                  <button key={d.v} type="button" className={`chip ${data.dietType === d.v ? 'on' : ''}`}
                    onClick={() => setData(p => ({ ...p, dietType: d.v }))}>
                    {d.icon} {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <span className="field-label">Activity level</span>
              <div className="options">
                {activities.map(a => (
                  <button key={a.v} type="button" className={`option row ${data.activityLevel === a.v ? 'on' : ''}`}
                    onClick={() => setData(p => ({ ...p, activityLevel: a.v }))}>
                    <span className="t">{a.label}</span>
                    <span className="s">{a.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 - Review */}
        {step === 3 && (
          <div className="fade-up">
            <p className="muted" style={{ marginBottom: 14 }}>Here's your profile summary. We'll calculate your TDEE and set your daily targets.</p>
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
              <div key={k} className="kv">
                <span className="k">{k}</span>
                <span className="v">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="alert" style={{ marginTop: 16, marginBottom: 0 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        {step > 0 && (
          <button className="btn ghost" onClick={() => setStep(s => s - 1)} style={{ flex: 1 }}>
            ← Back
          </button>
        )}
        <button className="btn primary" onClick={step < STEPS.length - 1 ? () => setStep(s => s + 1) : finish}
          disabled={saving} style={{ flex: 2 }}>
          {step < STEPS.length - 1 ? 'Continue →' : saving ? 'Setting up…' : 'Launch FitPulse →'}
        </button>
      </div>
    </div>
  );
}
