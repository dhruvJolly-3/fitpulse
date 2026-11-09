import React, { useState, useEffect, useCallback } from 'react';
import BarcodeScanner from '../components/BarcodeScanner';
import useToday from '../utils/useToday';
import Pulse from '../components/Pulse';
import { format, subDays, addDays } from 'date-fns';
import { useAuth, api } from '../context/AuthContext';
import Ring from '../components/Ring';
import WeekBars from '../components/WeekBars';
import RangeToggle from '../components/RangeToggle';
import { rangeStart, dailySeries, loggedAverage } from '../utils/series';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout'];
const MEAL_ICONS = { breakfast: '☀️', lunch: '🌤️', dinner: '🌙', snack: '🍎', pre_workout: '⚡', post_workout: '💪' };

// Scale a per-100 g food to an eaten amount (grams) → loggable entry
const scaleFood = (food, grams) => {
  const k = grams / 100;
  const r = (v) => Math.round((v || 0) * k * 10) / 10;
  return {
    name: food.name,
    brand: food.brand || undefined,
    quantity: Math.round(grams),
    unit: 'g',
    calories: Math.round((food.per100g.calories || 0) * k),
    protein: r(food.per100g.protein),
    carbs: r(food.per100g.carbs),
    fat: r(food.per100g.fat),
    fiber: r(food.per100g.fiber),
  };
};

export default function NutritionPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  // If the app stays open past midnight, move the log to the new day
  const today = useToday();
  useEffect(() => { setDate(today); }, [today]);
  const [log, setLog] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [mealType, setMealType] = useState('breakfast');
  const [search, setSearch] = useState('');
  const [custom, setCustom] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', quantity: 100 });
  const [addMode, setAddMode] = useState('search'); // 'search' | 'scan' | 'custom'
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchNote, setSearchNote] = useState('');
  const [selected, setSelected] = useState(null); // food chosen from search/scan
  const [qtyMode, setQtyMode] = useState('serving'); // 'serving' | 'grams'
  const [qty, setQty] = useState(1);
  const [weekData, setWeekData] = useState([]);
  const [range, setRange] = useState(7); // 7 or 30 days of history

  const fetchLog = async (d) => {
    const { data } = await api.get(`/nutrition/${d}`);
    setLog(data);
  };

  useEffect(() => { fetchLog(date); }, [date]);

  // Calorie history: one bar per day (un-logged days = 0), refetched on 7D/30D toggle
  useEffect(() => {
    api.get(`/nutrition/summary/week?startDate=${rangeStart(range)}&days=${range}`)
      .then(r => setWeekData(dailySeries(r.data, range, 'cals', l => l.totals?.calories)))
      .catch(() => {});
  }, [range]);

  const addFood = async (food) => {
    await api.post(`/nutrition/${date}/food`, { ...food, mealType, time: new Date().toISOString() });
    fetchLog(date);
    closeAdd();
  };

  const closeAdd = () => {
    setShowAdd(false);
    setSearch('');
    setResults([]);
    setSelected(null);
    setSearchNote('');
    setAddMode('search');
  };

  // Debounced food search: built-in Indian foods + Open Food Facts
  useEffect(() => {
    if (!showAdd || addMode !== 'search') return undefined;
    const q = search.trim();
    if (q.length < 2) { setResults([]); setSearchNote(''); return undefined; }
    setSearching(true);
    const t = setTimeout(() => {
      api.get('/foods/search', { params: { q } })
        .then(r => {
          setResults(r.data.results);
          setSearchNote(r.data.remoteError ? 'Packaged-food search is offline; showing built-in foods only.' : '');
        })
        .catch(err => setSearchNote(err.response?.data?.message || 'Search failed'))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [search, showAdd, addMode]);

  const pickFood = (food) => {
    setSelected(food);
    setQtyMode('serving');
    setQty(1);
  };

  const onBarcode = useCallback(async (code) => {
    setSearchNote('');
    try {
      const { data } = await api.get(`/foods/barcode/${code}`);
      pickFood(data);
      setAddMode('search');
    } catch (err) {
      setAddMode('search');
      setSearchNote(err.response?.data?.message || `No product found for ${code}.`);
    }
  }, []);

  const selectedGrams = selected ? (qtyMode === 'serving' ? (+qty || 0) * selected.serving.grams : +qty || 0) : 0;
  const preview = selected ? scaleFood(selected, selectedGrams) : null;

  const addCustom = async () => {
    if (!custom.name || !custom.calories) return;
    await addFood({ ...custom, calories: +custom.calories, protein: +custom.protein, carbs: +custom.carbs, fat: +custom.fat });
    setCustom({ name: '', calories: '', protein: '', carbs: '', fat: '', quantity: 100 });
  };

  const removeFood = async (foodId) => {
    await api.delete(`/nutrition/${date}/food/${foodId}`);
    fetchLog(date);
  };

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
        <div className="page-heading">
          <Pulse mood="eat" />
          <div>
          <h1 className="page-title">Nutrition</h1>
          <div className="page-date">track every bite, hit your macros</div>
        </div>
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
                <div className="ic"><Pulse mood="eat" size={92} /></div>
                <h3>No meals logged <span className="serif-it">yet</span></h3>
                <p>Start tracking to hit your {calTarget} kcal goal.</p>
                <button className="btn primary" onClick={() => setShowAdd(true)}>Log your first meal</button>
              </div>
            )}
          </div>

          {/* Weekly chart */}
          {weekData.length > 0 && (
            <div className="card span-5">
              <div className="card-h">
                <div>
                  <h3>{range}-day calories</h3>
                  <span className="label">target {calTarget} · avg {Math.round(loggedAverage(weekData, 'cals'))}</span>
                </div>
                <RangeToggle value={range} onChange={setRange} />
              </div>
              <WeekBars data={weekData} xKey="day" yKey="cals" label="Calories" target={calTarget} colorByTarget={false}
                isToday={d => d.date === format(new Date(), 'yyyy-MM-dd')} format={v => `${Math.round(v)} kcal`} />
            </div>
          )}
        </div>
      </div>

      {/* Add Food Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeAdd()}>
          <div className="modal">
            <div className="modal-head">
              <div className="modal-title">Log <span className="serif-it">food</span></div>
              <button className="icon-btn" onClick={closeAdd} title="Close">
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
              {['search', 'scan', 'custom'].map(m => (
                <button key={m} className={addMode === m ? 'on' : ''} onClick={() => { setAddMode(m); setSelected(null); }}>
                  {m === 'search' ? 'Search' : m === 'scan' ? 'Scan barcode' : 'Custom'}
                </button>
              ))}
            </div>

            {addMode === 'scan' ? (
              <BarcodeScanner onDetected={onBarcode} onCancel={() => setAddMode('search')} />
            ) : addMode === 'search' && selected ? (
              <div className="food-pick">
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {selected.image ? <img src={selected.image} alt="" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8, background: 'var(--bone)' }} /> : null}
                  <div style={{ minWidth: 0 }}>
                    <div className="t" style={{ fontWeight: 700 }}>{selected.name}</div>
                    <div className="s mono muted" style={{ fontSize: 12 }}>
                      {selected.brand ? `${selected.brand} · ` : ''}{selected.per100g.calories} kcal / 100 g
                    </div>
                  </div>
                </div>
                <div className="seg" style={{ marginTop: 12 }}>
                  <button className={qtyMode === 'serving' ? 'on' : ''} onClick={() => { setQtyMode('serving'); setQty(1); }}>
                    Servings ({selected.serving.label})
                  </button>
                  <button className={qtyMode === 'grams' ? 'on' : ''} onClick={() => { setQtyMode('grams'); setQty(selected.serving.grams); }}>Grams</button>
                </div>
                <div className="qty-row">
                  <div className="input-affix">
                    <input type="number" min="0" step={qtyMode === 'serving' ? 0.5 : 5} value={qty} onChange={e => setQty(e.target.value)} aria-label="Amount" />
                    <span>{qtyMode === 'serving' ? '×' : 'g'}</span>
                  </div>
                  <span className="kc mono" style={{ fontWeight: 700 }}>{preview.calories} kcal</span>
                </div>
                <div className="s mono muted" style={{ fontSize: 12, marginTop: 8 }}>
                  {Math.round(selectedGrams)} g · P {preview.protein}g · C {preview.carbs}g · F {preview.fat}g · Fib {preview.fiber}g
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button className="btn ghost sm" onClick={() => setSelected(null)}>Back</button>
                  <button className="btn primary sm" style={{ flex: 1 }} disabled={!selectedGrams} onClick={() => addFood(preview)}>
                    Add to {mealType.replace('_', ' ')}
                  </button>
                </div>
              </div>
            ) : addMode === 'search' ? (
              <>
                <input placeholder="Search foods, e.g. paneer, dal, Maggi…" value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 12 }} autoFocus />
                {searchNote && <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>{searchNote}</p>}
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {searching && !results.length && <p className="muted" style={{ fontSize: 13 }}>Searching…</p>}
                  {!searching && search.trim().length >= 2 && !results.length && (
                    <p className="muted" style={{ fontSize: 13 }}>No matches. Try another word, scan the barcode, or add it as a custom food.</p>
                  )}
                  {search.trim().length < 2 && (
                    <p className="muted" style={{ fontSize: 13 }}>Type at least 2 letters. Home-cooked Indian dishes and packaged foods are both covered.</p>
                  )}
                  {results.map(f => (
                    <button key={f.id} className="line-item" style={{ width: '100%', textAlign: 'left', padding: '11px 6px' }} onClick={() => pickFood(f)}>
                      <div style={{ minWidth: 0 }}>
                        <div className="t" style={{ fontWeight: 500 }}>{f.name}{f.brand ? <span className="muted"> · {f.brand}</span> : null}</div>
                        <div className="s mono">
                          {f.serving.label} · P {Math.round(f.per100g.protein * f.serving.grams / 10) / 10}g · C {Math.round(f.per100g.carbs * f.serving.grams / 10) / 10}g · F {Math.round(f.per100g.fat * f.serving.grams / 10) / 10}g
                        </div>
                      </div>
                      <div className="end"><span className="kc" style={{ fontWeight: 700 }}>{Math.round(f.per100g.calories * f.serving.grams / 100)}</span></div>
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
