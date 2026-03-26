import React, { useState } from 'react';
import { useAuth, api } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
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
  const [activeTab, setActiveTab] = useState('body');

  const setField = (section, key, val) => {
    if (section === 'root') setForm(p => ({ ...p, [key]: val }));
    else setForm(p => ({ ...p, profile: { ...p.profile, [key]: val } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/user/profile', form);
      updateUser(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const bmi = form.profile.weight && form.profile.height
    ? (form.profile.weight / (form.profile.height / 100) ** 2).toFixed(1)
    : null;

  const bmiLabel = bmi ? (bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese') : null;
  const bmiColor = bmi ? (bmi < 18.5 ? 'var(--accent2)' : bmi < 25 ? 'var(--accent)' : bmi < 30 ? 'var(--orange)' : 'var(--red)') : 'var(--text-3)';

  const TABS = ['body', 'goals', 'targets'];

  return (
    <div className="fade-up">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-dim)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--accent)' }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="page-title">{user?.name}</h1>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <span className="badge badge-green">{user?.profile?.goal?.replace('_',' ')}</span>
              <span className="badge badge-blue">{user?.profile?.dietType}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* TDEE Card */}
        {user?.tdee && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
            <div className="metric-tile">
              <span className="label">BMR</span>
              <span className="value" style={{ color: 'var(--accent2)' }}>{user.bmr || Math.round(user.tdee / 1.55)}</span>
              <span className="subtext">base metabolic rate</span>
            </div>
            <div className="metric-tile">
              <span className="label">TDEE</span>
              <span className="value" style={{ color: 'var(--accent)' }}>{user.tdee}</span>
              <span className="subtext">total daily energy</span>
            </div>
            {bmi && (
              <div className="metric-tile">
                <span className="label">BMI</span>
                <span className="value" style={{ color: bmiColor }}>{bmi}</span>
                <span className="subtext" style={{ color: bmiColor }}>{bmiLabel}</span>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-raised)', borderRadius: 'var(--r-md)', padding: 4, marginBottom: 20 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              style={{ flex: 1, padding: '8px', borderRadius: 'calc(var(--r-md) - 2px)', background: activeTab === t ? 'var(--bg-card)' : 'transparent', color: activeTab === t ? 'var(--text)' : 'var(--text-3)', fontWeight: 600, fontSize: '0.82rem', border: activeTab === t ? '1px solid var(--border)' : 'none', cursor: 'pointer', textTransform: 'capitalize' }}>
              {t === 'body' ? '🏃 Body' : t === 'goals' ? '🎯 Goals' : '📊 Targets'}
            </button>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          {/* Body Tab */}
          {activeTab === 'body' && (
            <div>
              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input value={form.name} onChange={e => setField('root', 'name', e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input type="number" value={form.profile.age} onChange={e => setField('profile', 'age', +e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select value={form.profile.gender} onChange={e => setField('profile', 'gender', e.target.value)}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Height (cm)</label>
                  <input type="number" value={form.profile.height} onChange={e => setField('profile', 'height', +e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Weight (kg)</label>
                  <input type="number" step="0.1" value={form.profile.weight} onChange={e => setField('profile', 'weight', +e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Target Weight (kg)</label>
                <input type="number" step="0.1" value={form.profile.targetWeight} onChange={e => setField('profile', 'targetWeight', +e.target.value)} />
              </div>
            </div>
          )}

          {/* Goals Tab */}
          {activeTab === 'goals' && (
            <div>
              <div className="form-group">
                <label className="form-label">Primary Goal</label>
                <select value={form.profile.goal} onChange={e => setField('profile', 'goal', e.target.value)}>
                  <option value="lose_weight">Lose Weight</option>
                  <option value="maintain">Maintain</option>
                  <option value="gain_muscle">Build Muscle</option>
                  <option value="endurance">Endurance</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Diet Type</label>
                <select value={form.profile.dietType} onChange={e => setField('profile', 'dietType', e.target.value)}>
                  <option value="non-veg">Non-Vegetarian</option>
                  <option value="veg">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="keto">Keto</option>
                  <option value="paleo">Paleo</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Activity Level</label>
                <select value={form.profile.activityLevel} onChange={e => setField('profile', 'activityLevel', e.target.value)}>
                  <option value="sedentary">Sedentary (desk job, no exercise)</option>
                  <option value="lightly_active">Lightly Active (1-3 days/week)</option>
                  <option value="moderately_active">Moderately Active (3-5 days/week)</option>
                  <option value="very_active">Very Active (6-7 days/week)</option>
                  <option value="extra_active">Athlete (2x/day training)</option>
                </select>
              </div>
              {user?.dailyCalorieTarget && (
                <div style={{ padding: '14px', background: 'var(--accent-dim)', borderRadius: 'var(--r-md)', border: '1px solid rgba(181,242,61,0.2)', marginTop: 8 }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginBottom: 4 }}>Your calculated daily calorie target</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>{user.dailyCalorieTarget} kcal</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 4 }}>
                    Protein: {user.macroTargets?.protein}g · Carbs: {user.macroTargets?.carbs}g · Fat: {user.macroTargets?.fat}g
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Targets Tab */}
          {activeTab === 'targets' && (
            <div>
              <div className="form-group">
                <label className="form-label">Daily Water Target (ml)</label>
                <input type="number" step="100" value={form.waterTarget} onChange={e => setField('root', 'waterTarget', +e.target.value)} />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 4 }}>Recommended: 2500-3000ml/day</div>
              </div>
              <div className="form-group">
                <label className="form-label">Daily Step Goal</label>
                <input type="number" step="500" value={form.stepTarget} onChange={e => setField('root', 'stepTarget', +e.target.value)} />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 4 }}>WHO recommends 8,000-10,000 steps</div>
              </div>
              <div className="form-group">
                <label className="form-label">Sleep Target (hours)</label>
                <input type="number" step="0.5" min="5" max="12" value={form.sleepTarget} onChange={e => setField('root', 'sleepTarget', +e.target.value)} />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 4 }}>Adults need 7-9 hours</div>
              </div>
            </div>
          )}
        </div>

        <button className="btn btn-primary" style={{ width: '100%', padding: '14px', marginBottom: 12 }} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : saved ? '✅ Saved!' : '💾 Save Changes'}
        </button>

        <div className="divider" />

        {/* Danger zone */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Account</div>
          <button className="btn btn-danger" style={{ width: '100%' }} onClick={logout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
