import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../context/AuthContext';
import BarcodeScanner from './BarcodeScanner';

// "Search foods" tab of the Log food sheet:
//   • quick picks (common foods, instant)
//   • the Open Food Facts database (millions of packaged foods) via /api/foods
//   • barcode scanning
// Picking a database food asks for the portion, then logs scaled nutrition.
const per = (v, grams) => (v == null ? undefined : Math.round(v * grams) / 100);

function PortionPicker({ food, onAdd, onBack }) {
  const [grams, setGrams] = useState(food.serving?.grams || 100);
  const g = Math.max(0, +grams || 0);
  const n = food.per100g;
  const scaled = {
    calories: Math.round(per(n.calories, g)), protein: per(n.protein, g) ?? 0, carbs: per(n.carbs, g) ?? 0,
    fat: per(n.fat, g) ?? 0, fiber: per(n.fiber, g), sugar: per(n.sugar, g), sodium: per(n.sodium, g),
  };
  const add = () => onAdd({ name: food.brand ? `${food.name} (${food.brand})` : food.name, brand: food.brand || undefined, quantity: g, unit: 'g', ...scaled });

  return (
    <div className="portion">
      <div className="portion-head">
        {food.image ? <img src={food.image} alt="" /> : <div className="portion-ph">🍽️</div>}
        <div>
          <div className="t">{food.name}</div>
          <div className="s">{[food.brand, `${n.calories} kcal / 100 g`].filter(Boolean).join(' · ')}</div>
        </div>
      </div>
      <div className="field">
        <label>Amount (g or ml)</label>
        <input type="number" inputMode="decimal" min="1" value={grams} onChange={e => setGrams(e.target.value)} autoFocus />
      </div>
      <div className="chips" style={{ marginBottom: 14 }}>
        {food.serving && <button type="button" className="chip" onClick={() => setGrams(food.serving.grams)}>1 serving ({food.serving.label})</button>}
        {[50, 100, 150, 200].map(v => <button key={v} type="button" className="chip" onClick={() => setGrams(v)}>{v} g</button>)}
      </div>
      <div className="portion-macros">
        <div><b>{scaled.calories}</b><span>kcal</span></div>
        <div><b>{Math.round(scaled.protein)}g</b><span>protein</span></div>
        <div><b>{Math.round(scaled.carbs)}g</b><span>carbs</span></div>
        <div><b>{Math.round(scaled.fat)}g</b><span>fat</span></div>
      </div>
      <button className="btn primary block" onClick={add} disabled={!g}>Add {g} g</button>
      <button className="link-btn" type="button" style={{ display: 'block', margin: '10px auto 0' }} onClick={onBack}>Back</button>
    </div>
  );
}

export default function FoodSearch({ quickFoods, onAdd }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState(null);
  const [scanning, setScanning] = useState(false);

  // Search the database 400 ms after typing stops
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); setError(''); return undefined; }
    let live = true;
    const t = setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const { data } = await api.get('/foods/search', { params: { q: term } });
        if (live) setResults(data);
      } catch (err) {
        if (live) setError(err.response?.data?.message || 'Food database is unavailable right now');
      } finally { if (live) setLoading(false); }
    }, 400);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  const onBarcode = useCallback(async (code) => {
    setScanning(false); setError(''); setLoading(true);
    try {
      const { data } = await api.get(`/foods/barcode/${code}`);
      setPicked(data);
    } catch (err) {
      setError(err.response?.data?.message || `Nothing found for barcode ${code}`);
    } finally { setLoading(false); }
  }, []);

  if (picked) return <PortionPicker food={picked} onAdd={onAdd} onBack={() => setPicked(null)} />;
  if (scanning) return <BarcodeScanner onDetected={onBarcode} onClose={() => setScanning(false)} />;

  const quick = quickFoods.filter(f => f.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <div className="food-search-bar">
        <input placeholder="Search any food or brand…" value={q} onChange={e => setQ(e.target.value)} autoFocus />
        <button type="button" className="btn ghost sm scan-btn" onClick={() => setScanning(true)} title="Scan a barcode">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8"/></svg>
          Scan
        </button>
      </div>
      {error && <div className="alert" style={{ marginBottom: 10 }}>{error}</div>}
      <div className="food-results">
        {quick.length > 0 && <div className="label food-sec">Quick picks</div>}
        {quick.map((f, i) => (
          <button key={`q${i}`} className="line-item food-row" onClick={() => onAdd(f)}>
            <div>
              <div className="t">{f.name}</div>
              <div className="s mono">P {f.protein}g · C {f.carbs}g · F {f.fat}g</div>
            </div>
            <div className="end"><span className="kc">{f.calories}</span></div>
          </button>
        ))}
        {q.trim().length >= 2 && <div className="label food-sec">Food database {loading && '· searching…'}</div>}
        {results.map(f => (
          <button key={f.code} className="line-item food-row" onClick={() => setPicked(f)}>
            <div className="food-row-main">
              {f.image ? <img src={f.image} alt="" loading="lazy" /> : <span className="food-row-ph">🍽️</span>}
              <div>
                <div className="t">{f.name}</div>
                <div className="s">{[f.brand, 'per 100 g'].filter(Boolean).join(' · ')}</div>
              </div>
            </div>
            <div className="end"><span className="kc">{Math.round(f.per100g.calories)}</span></div>
          </button>
        ))}
        {q.trim().length >= 2 && !loading && !error && results.length === 0 && (
          <p className="muted-p">No matches in the database. Try another name, scan the barcode, or use Custom entry.</p>
        )}
      </div>
      <p className="food-credit">Food data from <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer">Open Food Facts</a></p>
    </>
  );
}
