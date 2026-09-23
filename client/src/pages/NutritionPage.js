import React, { useState, useEffect } from 'react';
import { format, subDays, addDays } from 'date-fns';
import { useAuth, api } from '../context/AuthContext';
import Ring from '../components/Ring';
import WeekBars from '../components/WeekBars';

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

  const isToday = date === format(new Date(), 'yyyy-MM-dd');
  const pct = (cur, max) => `${Math.min(max > 0 ? cur / max * 100 : 0, 100)}%`;
  const macros = [
    { label: 'Protein', cur: totals.protein, max: user?.macroTargets?.protein || 150, color: 'var(--matcha-2)', bar: 'lime' },
    { label: 'Carbohydrates', cur: totals.carbs, max: user?.macroTargets?.carbs || 250, color: 'var(--ink)', bar: 'ink' },
    { label: 'Fat', cur: totals.fat, max: user?.macroTargets?.fat || 65, color: 'var(--coral)', bar: '' },
    { label: 'Fiber', cur: totals.fiber || 0, max: 30, color: 'var(--ink-30)', bar: 'ink' },
  ];

  return (
    <div className="fade-up">
      <header className="page-header">
        <div>
          <h1 className="page-title">Nutrition</h1>
          <div className="page-date">track every bite, hit your macros</div>
        </div>
        <div className="page-actions">
          <button className="icon-btn bordered" onClick={() => setDate(format(subDays(new Date(date), 1), 'yyyy-MM-dd'))} title="Previous day">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span className="mono" style={{ fontSize: 13, fontWeight: 700, minWidth: 92, textAlign: 'center' }}>
            {isToday ? 'Today' : format(new Date(date + 'T12:00:00'), 'EEE, MMM d')}
          </span>
          <button className="icon-btn bordered" onClick={() => setDate(format(addDays(new Date(date), 1), 'yyyy-MM-dd'))}
            disabled={date >= format(new Date(), 'yyyy-MM-dd')} title="Next day">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <button className="btn primary" onClick={() => setShowAdd(true)}>+ Log food</button>
        </div>
      </header>

      <div className="page-body">
        <div className="grid g-12">
          {/* Calories ring */}
          <div className="card lime span-4 ring-card">
            <Ring value={totals.calories} max={calTarget}>
              <div className="big">{Math.round(totals.calories)}</div>
              <div className="sub">of {calTarget.toLocaleString()} kcal</div>
            </Ring>
            <div className="ring-foot">
              {remaining >= 0
                ? <><b>{Math.round(remaining)} kcal</b> left</>
                : <><b style={{ color: 'var(--coral)' }}>{Math.round(-remaining)} kcal</b> over</>}
            </div>
          </div>

          {/* Macro split */}
          <div className="card span-8">
            <div className="card-h"><h3>Macro split</h3><span className="pill out">vs target</span></div>
            <div className="legend">
              {macros.map(m => (
                <React.Fragment key={m.label}>
                  <div className="row">
                    <span className="sw" style={{ background: m.color }} />{m.label}
                    <b>{Math.round(m.cur)} / {m.max}g</b>
                  </div>
                  <div className={`bar ${m.bar}`}><i style={{ width: pct(m.cur, m.max), background: m.label === 'Fiber' ? 'var(--ink-30)' : undefined }} /></div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="grid g-12">
          {/* Meals */}
          <div className="card span-7">
            <div className="card-h">
              <h3>{isToday ? "Today's meals" : 'Meals'}</h3>
              <span className="label">{log?.foods?.length || 0} logged</span>
            </div>

            {MEAL_TYPES.map(mt => {
              const foods = (log?.foods || []).filter(f => f.mealType === mt);
              const mealCals = foods.reduce((s, f) => s + (f.calories || 0), 0);
              if (foods.length === 0) return null;
              return (
                <div key={mt} className="meal-block">
                  <div className="mh">
                    <span className="nm">{MEAL_ICONS[mt]} {mt.replace('_', ' ')}</span>
                    <span className="kc">{Math.round(mealCals)} kcal</span>
                  </div>
                  {foods.map(f => (
                    <div key={f._id} className="line-item">
                      <div>
                        <div className="t" style={{ fontWeight: 500 }}>{f.name}</div>
                        <div className="s mono">P {Math.round(f.protein)}g · C {Math.round(f.carbs)}g · F {Math.round(f.fat)}g</div>
                      </div>
                      <div className="end">
                        <span className="kc">{Math.round(f.calories)}</span>
                        <button className="icon-btn" onClick={() => removeFood(f._id)} title="Remove">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => { setMealType(mt); setShowAdd(true); }}>
                    + Add to {mt.replace('_', ' ')}
                  </button>
                </div>
              );
            })}

            {(log?.foods?.length === 0 || !log) && (
              <div className="empty">
                <div className="ic">🍽️</div>
                <h3>No meals logged <span className="serif-it">yet</span></h3>
                <p>Start tracking to hit your {calTarget} kcal goal.</p>
                <button className="btn primary" onClick={() => setShowAdd(true)}>Log your first meal</button>
              </div>
            )}
          </div>

          {/* Weekly chart */}
          {weekData.length > 0 && (
            <div className="card span-5">
              <div className="card-h"><h3>7-day calories</h3><span className="label">target {calTarget}</span></div>
              <WeekBars data={weekData} xKey="date" yKey="cals" label="Calories" target={calTarget} colorByTarget={false}
                isToday={d => d.date === format(new Date(), 'MM-dd')} format={v => `${Math.round(v)} kcal`} />
            </div>
          )}
        </div>
      </div>

      {/* Add Food Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="modal-head">
              <div className="modal-title">Log <span className="serif-it">food</span></div>
              <button className="icon-btn" onClick={() => setShowAdd(false)} title="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Meal type selector */}
            <div className="chips" style={{ marginBottom: 16 }}>
              {MEAL_TYPES.map(mt => (
                <button key={mt} className={`chip ${mealType === mt ? 'on' : ''}`} onClick={() => setMealType(mt)}>
                  {MEAL_ICONS[mt]} {mt.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Mode toggle */}
            <div className="seg" style={{ marginBottom: 16 }}>
              {['search', 'custom'].map(m => (
                <button key={m} className={addMode === m ? 'on' : ''} onClick={() => setAddMode(m)}>
                  {m === 'search' ? 'Search foods' : 'Custom entry'}
                </button>
              ))}
            </div>

            {addMode === 'search' ? (
              <>
                <input placeholder="Search foods…" value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 12 }} autoFocus />
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {(search ? filtered : FOOD_DB).map((f, i) => (
                    <button key={i} className="line-item" style={{ width: '100%', textAlign: 'left', padding: '11px 6px' }} onClick={() => addFood(f)}>
                      <div>
                        <div className="t" style={{ fontWeight: 500 }}>{f.name}</div>
                        <div className="s mono">P {f.protein}g · C {f.carbs}g · F {f.fat}g</div>
                      </div>
                      <div className="end"><span className="kc" style={{ fontWeight: 700 }}>{f.calories}</span></div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div>
                <div className="field">
                  <label>Food name</label>
                  <input placeholder="e.g. Homemade Dal" value={custom.name} onChange={e => setCustom(p => ({...p, name: e.target.value}))} />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Calories</label>
                    <input type="number" placeholder="0" value={custom.calories} onChange={e => setCustom(p => ({...p, calories: e.target.value}))} />
                  </div>
                  <div className="field">
                    <label>Protein (g)</label>
                    <input type="number" placeholder="0" value={custom.protein} onChange={e => setCustom(p => ({...p, protein: e.target.value}))} />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Carbs (g)</label>
                    <input type="number" placeholder="0" value={custom.carbs} onChange={e => setCustom(p => ({...p, carbs: e.target.value}))} />
                  </div>
                  <div className="field">
                    <label>Fat (g)</label>
                    <input type="number" placeholder="0" value={custom.fat} onChange={e => setCustom(p => ({...p, fat: e.target.value}))} />
                  </div>
                </div>
                <button className="btn primary block" onClick={addCustom}>Add food</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
