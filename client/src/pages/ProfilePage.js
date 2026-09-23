import React, { useState } from 'react';
import { useAuth, api } from '../context/AuthContext';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    profile: {
      age: user?.profile?.age || '',
      gender: user?.profile?.gender || 'male',
      height: user?.profile?.height || '',
      weight: user?.profile?.weight || '',
      targetWeight: user?.profile?.targetWeight || '',
      activityLevel: user?.profile?.activityLevel || 'moderately_active',
      dietType: user?.profile?.dietType || 'non-veg',
      goal: user?.profile?.goal || 'maintain',
    },
    waterTarget: user?.waterTarget || 2500,
    stepTarget: user?.stepTarget || 10000,
    sleepTarget: user?.sleepTarget || 8,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('body');

  const setField = (section, key, val) => {
    if (section === 'root') setForm(p => ({ ...p, [key]: val }));
    else setForm(p => ({ ...p, profile: { ...p.profile, [key]: val } }));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put('/user/profile', form);
      updateUser(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      // Server-side validation message, e.g. "Age must be between 13 and 100"
      setError(e.response?.data?.message || 'Could not save changes');
    }
    setSaving(false);
  };

  const bmi = form.profile.weight && form.profile.height
    ? (form.profile.weight / (form.profile.height / 100) ** 2).toFixed(1)
    : null;

  const bmiLabel = bmi ? (bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese') : null;
  const bmiColor = bmi && bmi >= 25 ? 'var(--coral)' : undefined; // coral flags out-of-range BMI

  const TABS = ['body', 'goals', 'targets'];

  return (
    <div className="fade-up">
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="avatar lg">{user?.name?.[0]?.toUpperCase()}</div>
          <div>
            <h1 className="page-title">{user?.name}</h1>
            <div className="chips" style={{ marginTop: 8 }}>
              <span className="pill matcha">{user?.profile?.goal?.replace('_',' ')}</span>
              <span className="pill out">{user?.profile?.dietType}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="page-body">
        {/* TDEE stats */}
        {user?.tdee && (
          <div className="grid g-3">
            <div className="card stat-tile">
              <div className="k">BMR</div>
              <div className="v">{user.bmr || Math.round(user.tdee / 1.55)}<span className="u">kcal</span></div>
              <div className="d">base metabolic rate</div>
            </div>
            <div className="card lime stat-tile">
              <div className="k" style={{ color: 'var(--ink-70)' }}>TDEE</div>
              <div className="v">{user.tdee}<span className="u" style={{ color: 'var(--ink-70)' }}>kcal</span></div>
              <div className="d" style={{ color: 'var(--ink-70)' }}>total daily energy</div>
            </div>
            {bmi && (
              <div className="card stat-tile">
                <div className="k">BMI</div>
                <div className="v" style={{ color: bmiColor }}>{bmi}</div>
                <div className="d" style={{ color: bmiColor }}>{bmiLabel}</div>
              </div>
            )}
          </div>
        )}

        <div className="grid g-12">
          <div className="span-8">
            {/* Tabs */}
            <div className="seg" style={{ marginBottom: 'var(--gap)' }}>
              {TABS.map(t => (
                <button key={t} className={activeTab === t ? 'on' : ''} onClick={() => setActiveTab(t)}>{t}</button>
              ))}
            </div>

            <div className="card">
              {/* Body Tab */}
              {activeTab === 'body' && (
                <div>
                  <div className="field">
                    <label>Display name</label>
                    <input value={form.name} onChange={e => setField('root', 'name', e.target.value)} />
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>Age</label>
                      <input type="number" value={form.profile.age} onChange={e => setField('profile', 'age', +e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Gender</label>
                      <select value={form.profile.gender} onChange={e => setField('profile', 'gender', e.target.value)}>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>Height (cm)</label>
                      <input type="number" value={form.profile.height} onChange={e => setField('profile', 'height', +e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Weight (kg)</label>
                      <input type="number" step="0.1" value={form.profile.weight} onChange={e => setField('profile', 'weight', +e.target.value)} />
                    </div>
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Target weight (kg)</label>
                    <input type="number" step="0.1" value={form.profile.targetWeight} onChange={e => setField('profile', 'targetWeight', +e.target.value)} />
                  </div>
                </div>
              )}

              {/* Goals Tab */}
              {activeTab === 'goals' && (
                <div>
                  <div className="field">
                    <label>Primary goal</label>
                    <select value={form.profile.goal} onChange={e => setField('profile', 'goal', e.target.value)}>
                      <option value="lose_weight">Lose Weight</option>
                      <option value="maintain">Maintain</option>
                      <option value="gain_muscle">Build Muscle</option>
                      <option value="endurance">Endurance</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Diet type</label>
                    <select value={form.profile.dietType} onChange={e => setField('profile', 'dietType', e.target.value)}>
                      <option value="non-veg">Non-Vegetarian</option>
                      <option value="veg">Vegetarian</option>
                      <option value="vegan">Vegan</option>
                      <option value="keto">Keto</option>
                      <option value="paleo">Paleo</option>
                    </select>
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Activity level</label>
                    <select value={form.profile.activityLevel} onChange={e => setField('profile', 'activityLevel', e.target.value)}>
                      <option value="sedentary">Sedentary (desk job, no exercise)</option>
                      <option value="lightly_active">Lightly Active (1-3 days/week)</option>
                      <option value="moderately_active">Moderately Active (3-5 days/week)</option>
                      <option value="very_active">Very Active (6-7 days/week)</option>
                      <option value="extra_active">Athlete (2x/day training)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Targets Tab */}
              {activeTab === 'targets' && (
                <div>
                  <div className="field">
                    <label>Daily water target (ml)</label>
                    <input type="number" step="100" value={form.waterTarget} onChange={e => setField('root', 'waterTarget', +e.target.value)} />
                    <span className="hint">Recommended: 2500-3000ml/day</span>
                  </div>
                  <div className="field">
                    <label>Daily step goal</label>
                    <input type="number" step="500" value={form.stepTarget} onChange={e => setField('root', 'stepTarget', +e.target.value)} />
                    <span className="hint">WHO recommends 8,000-10,000 steps</span>
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Sleep target (hours)</label>
                    <input type="number" step="0.5" min="5" max="12" value={form.sleepTarget} onChange={e => setField('root', 'sleepTarget', +e.target.value)} />
                    <span className="hint">Adults need 7-9 hours</span>
                  </div>
                </div>
              )}
            </div>

            {error && <div className="alert" style={{ marginTop: 16, marginBottom: 0 }}>{error}</div>}

            <button className="btn primary block" style={{ marginTop: 16 }} onClick={save} disabled={saving}>
              {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
            </button>
          </div>

          <div className="span-4 stack">
            {/* Calculated target */}
            {user?.dailyCalorieTarget && (
              <div className="card dark stat-tile">
                <div className="k">Daily calorie target</div>
                <div className="v">{user.dailyCalorieTarget}<span className="u">kcal</span></div>
                <div className="d mono" style={{ fontSize: 11 }}>
                  P {user.macroTargets?.protein}g · C {user.macroTargets?.carbs}g · F {user.macroTargets?.fat}g
                </div>
              </div>
            )}

            <div className="card">
              <div className="card-h"><h3>Account</h3></div>
              <button className="btn danger block" onClick={logout}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
