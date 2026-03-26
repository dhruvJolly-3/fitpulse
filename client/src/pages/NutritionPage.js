import React, { useState, useEffect } from 'react';
import { format, subDays, addDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useAuth, api } from '../context/AuthContext';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout'];
const MEAL_ICONS = { breakfast: '☀️', lunch: '🌤️', dinner: '🌙', snack: '🍎', pre_workout: '⚡', post_workout: '💪' };

// Food database (sample - real app would use a full API like Nutritionix)
const FOOD_DB = [
  { name: 'Oats (100g)', calories: 389, protein: 17, carbs: 66, fat: 7 },
  { name: 'Chicken Breast (100g)', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: 'Brown Rice (100g cooked)', calories: 112, protein: 2.6, carbs: 24, fat: 0.9 },
  { name: 'Whole Egg', calories: 78, protein: 6, carbs: 0.6, fat: 5 },
  { name: 'Banana (medium)', calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { name: 'Paneer (100g)', calories: 265, protein: 18, carbs: 1.2, fat: 20 },
  { name: 'Dal (100g cooked)', calories: 116, protein: 9, carbs: 20, fat: 0.4 },
  { name: 'Whey Protein (30g scoop)', calories: 120, protein: 24, carbs: 3, fat: 2 },
  { name: 'Almonds (30g)', calories: 173, protein: 6, carbs: 6, fat: 15 },
  { name: 'Greek Yogurt (100g)', calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
  { name: 'Sweet Potato (100g)', calories: 86, protein: 1.6, carbs: 20, fat: 0.1 },
  { name: 'Salmon (100g)', calories: 208, protein: 20, carbs: 0, fat: 13 },
  { name: 'Roti (1 medium)', calories: 104, protein: 3, carbs: 20, fat: 1.5 },
  { name: 'Rice (100g cooked)', calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: 'Milk (250ml)', calories: 150, protein: 8, carbs: 12, fat: 8 },
  { name: 'Apple (medium)', calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { name: 'Peanut Butter (2 tbsp)', calories: 190, protein: 8, carbs: 6, fat: 16 },
  { name: 'Broccoli (100g)', calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  { name: 'Tofu (100g)', calories: 76, protein: 8, carbs: 2, fat: 4.8 },
  { name: 'Avocado (100g)', calories: 160, protein: 2, carbs: 9, fat: 15 },
];

export default function NutritionPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [log, setLog] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [mealType, setMealType] = useState('breakfast');
  const [search, setSearch] = useState('');
  const [custom, setCustom] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', quantity: 100 });
  const [addMode, setAddMode] = useState('search'); // 'search' | 'custom'
  const [weekData, setWeekData] = useState([]);

  const fetchLog = async (d) => {
    const { data } = await api.get(`/nutrition/${d}`);
    setLog(data);
  };

  useEffect(() => { fetchLog(date); }, [date]);

  useEffect(() => {
    const start = format(subDays(new Date(), 6), 'yyyy-MM-dd');
    api.get(`/nutrition/summary/week?startDate=${start}`)
      .then(r => setWeekData(r.data.map(d => ({ date: d.date.slice(5), cals: d.totals?.calories || 0 }))))
      .catch(() => {});
  }, []);

  const addFood = async (food) => {
    await api.post(`/nutrition/${date}/food`, { ...food, mealType, time: new Date().toISOString() });
    fetchLog(date);
    setShowAdd(false);
    setSearch('');
  };

  const addCustom = async () => {
    if (!custom.name || !custom.calories) return;
    await addFood({ ...custom, calories: +custom.calories, protein: +custom.protein, carbs: +custom.carbs, fat: +custom.fat });
    setCustom({ name: '', calories: '', protein: '', carbs: '', fat: '', quantity: 100 });
  };

  const removeFood = async (foodId) => {
    await api.delete(`/nutrition/${date}/food/${foodId}`);
    fetchLog(date);
  };

  const filtered = FOOD_DB.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  const calTarget = user?.dailyCalorieTarget || 2000;
  const totals = log?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const remaining = calTarget - totals.calories;

  const mealGroups = MEAL_TYPES.map(mt => ({
    type: mt,
    foods: (log?.foods || []).filter(f => f.mealType === mt)
  })).filter(g => g.foods.length > 0 || showAdd);

  return (
    <div className="fade-up">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Nutrition</h1>
            <p className="page-subtitle">Track every bite, hit your macros</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Log Food</button>
        </div>
      </div>

      <div className="page-body">
        {/* Date navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => setDate(format(subDays(new Date(date), 1), 'yyyy-MM-dd'))}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.95rem' }}>
            {date === format(new Date(), 'yyyy-MM-dd') ? 'Today' : format(new Date(date + 'T12:00:00'), 'EEE, MMM d')}
          </span>
          <button className="btn btn-ghost btn-icon" onClick={() => setDate(format(addDays(new Date(date), 1), 'yyyy-MM-dd'))}
            disabled={date >= format(new Date(), 'yyyy-MM-dd')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        {/* Summary bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Consumed', val: Math.round(totals.calories), unit: 'kcal', color: 'var(--accent)' },
            { label: 'Remaining', val: Math.round(remaining), unit: 'kcal', color: remaining < 0 ? 'var(--red)' : 'var(--text)' },
            { label: 'Protein', val: Math.round(totals.protein), unit: 'g', color: 'var(--accent2)' },
            { label: 'Carbs', val: Math.round(totals.carbs), unit: 'g', color: 'var(--orange)' },
          ].map(s => (
            <div key={s.label} className="metric-tile">
              <span className="label">{s.label}</span>
              <span className="value" style={{ fontSize: '1.6rem', color: s.color }}>{s.val}</span>
              <span className="subtext">{s.unit}</span>
            </div>
          ))}
        </div>

        {/* Macro progress */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">Macro Breakdown</div>
          <div className="macro-bar-wrap">
            {[
              { label: 'Protein', cur: totals.protein, max: user?.macroTargets?.protein || 150, color: '#5b8eff' },
              { label: 'Carbohydrates', cur: totals.carbs, max: user?.macroTargets?.carbs || 250, color: '#b5f23d' },
              { label: 'Fat', cur: totals.fat, max: user?.macroTargets?.fat || 65, color: '#ff9f43' },
              { label: 'Fiber', cur: totals.fiber || 0, max: 30, color: '#2ed9c3' },
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
        </div>

        {/* Weekly chart */}
        {weekData.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">7-Day Calories</div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={weekData} barCategoryGap="30%">
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <ReferenceLine y={calTarget} stroke="var(--accent)" strokeDasharray="3 3" strokeOpacity={0.5} />
                <Bar dataKey="cals" fill="var(--accent)" radius={[4, 4, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Meal logs */}
        {MEAL_TYPES.map(mt => {
          const foods = (log?.foods || []).filter(f => f.mealType === mt);
          const mealCals = foods.reduce((s, f) => s + (f.calories || 0), 0);
          if (foods.length === 0) return null;
          return (
            <div key={mt} className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.1rem' }}>{MEAL_ICONS[mt]}</span>
                  <span style={{ fontWeight: 700, textTransform: 'capitalize', fontSize: '0.9rem' }}>{mt.replace('_', ' ')}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--accent)' }}>{Math.round(mealCals)} kcal</span>
              </div>
              {foods.map(f => (
                <div key={f._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{f.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>P: {Math.round(f.protein)}g · C: {Math.round(f.carbs)}g · F: {Math.round(f.fat)}g</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-2)' }}>{Math.round(f.calories)} kcal</span>
                    <button className="btn btn-ghost btn-icon" onClick={() => removeFood(f._id)} style={{ color: 'var(--text-3)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                    </button>
                  </div>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => { setMealType(mt); setShowAdd(true); }}>
                + Add to {mt.replace('_', ' ')}
              </button>
            </div>
          );
        })}

        {(log?.foods?.length === 0 || !log) && (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🍽️</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>No meals logged yet</div>
            <div style={{ fontSize: '0.83rem', color: 'var(--text-3)', marginBottom: 20 }}>Start tracking to hit your {calTarget} kcal goal</div>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>Log Your First Meal</button>
          </div>
        )}
      </div>

      {/* Add Food Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-title">Log Food</div>

            {/* Meal type selector */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {MEAL_TYPES.map(mt => (
                <button key={mt} onClick={() => setMealType(mt)}
                  style={{ padding: '5px 12px', borderRadius: 'var(--r-pill)', border: `1px solid ${mealType === mt ? 'var(--accent)' : 'var(--border)'}`, background: mealType === mt ? 'var(--accent-dim)' : 'transparent', color: mealType === mt ? 'var(--accent)' : 'var(--text-3)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                  {MEAL_ICONS[mt]} {mt.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--bg-raised)', borderRadius: 'var(--r-md)', padding: 4, marginBottom: 16 }}>
              {['search', 'custom'].map(m => (
                <button key={m} onClick={() => setAddMode(m)}
                  style={{ flex: 1, padding: '7px', borderRadius: 'calc(var(--r-md) - 2px)', background: addMode === m ? 'var(--bg-card)' : 'transparent', color: addMode === m ? 'var(--text)' : 'var(--text-3)', fontWeight: 600, fontSize: '0.82rem', border: addMode === m ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                  {m === 'search' ? '🔍 Search Foods' : '✏️ Custom Entry'}
                </button>
              ))}
            </div>

            {addMode === 'search' ? (
              <>
                <input placeholder="Search foods…" value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 12 }} autoFocus />
                <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(search ? filtered : FOOD_DB).map((f, i) => (
                    <div key={i} onClick={() => addFood(f)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'var(--bg-raised)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.12s' }}
                      onMouseOver={e => e.currentTarget.style.borderColor = 'var(--border-bright)'}
                      onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{f.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>P:{f.protein}g C:{f.carbs}g F:{f.fat}g</div>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 700 }}>{f.calories}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div>
                <div className="form-group">
                  <label className="form-label">Food Name</label>
                  <input placeholder="e.g. Homemade Dal" value={custom.name} onChange={e => setCustom(p => ({...p, name: e.target.value}))} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Calories</label>
                    <input type="number" placeholder="0" value={custom.calories} onChange={e => setCustom(p => ({...p, calories: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Protein (g)</label>
                    <input type="number" placeholder="0" value={custom.protein} onChange={e => setCustom(p => ({...p, protein: e.target.value}))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Carbs (g)</label>
                    <input type="number" placeholder="0" value={custom.carbs} onChange={e => setCustom(p => ({...p, carbs: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fat (g)</label>
                    <input type="number" placeholder="0" value={custom.fat} onChange={e => setCustom(p => ({...p, fat: e.target.value}))} />
                  </div>
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={addCustom}>Add Food</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
