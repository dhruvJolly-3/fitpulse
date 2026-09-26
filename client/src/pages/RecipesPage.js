import React, { useEffect, useState } from 'react';
import Pulse from '../components/Pulse';
import { api, useAuth } from '../context/AuthContext';

// Recipe ideas from TheMealDB (proxied through our server at /api/recipes).
// Note: TheMealDB has no calorie/macro data, so recipes can't be logged
// straight into Nutrition — log the dish there once it's cooked.
const CUISINES = ['Indian', 'Chinese', 'Italian', 'Mexican', 'Thai', 'Japanese', 'American', 'British'];
// TheMealDB categories that map onto our diet types
const CATEGORY_FOR_DIET = { veg: 'Vegetarian', vegan: 'Vegan' };

export default function RecipesPage() {
  const { user } = useAuth();
  const dietCategory = CATEGORY_FOR_DIET[user?.profile?.dietType];

  // What the grid is showing: a text search, a cuisine, or a diet category
  const [filter, setFilter] = useState(() => dietCategory ? { category: dietCategory } : { area: 'Indian' });
  const [search, setSearch] = useState('');
  const [recipes, setRecipes] = useState(null); // null = loading
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);       // full recipe in the modal
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRecipes(null); setError('');
    api.get('/recipes/search', { params: filter })
      .then(r => { if (!cancelled) setRecipes(r.data); })
      .catch(err => { if (!cancelled) { setRecipes([]); setError(err.response?.data?.message || 'Could not load recipes'); } });
    return () => { cancelled = true; };
  }, [filter]);

  const submitSearch = (e) => {
    e.preventDefault();
    if (search.trim().length >= 2) setFilter({ q: search.trim() });
  };

  // Cuisine/category lists only include id + name + photo; fetch details on click
  const openRecipe = async (r) => {
    if (r.instructions) return setOpen(r);
    setOpening(true);
    try { setOpen((await api.get(`/recipes/${r.id}`)).data); }
    catch (err) { setError(err.response?.data?.message || 'Could not load that recipe'); }
    finally { setOpening(false); }
  };

  const heading = filter.q ? `“${filter.q}”` : filter.area || filter.category;

  return (
    <div className="fade-up">
      <header className="page-header">
        <div className="page-heading">
          <Pulse mood="eat" />
          <div>
          <h1 className="page-title">Recipes <span className="serif-it">& ideas</span></h1>
          <div className="page-date">cook something that fits your goal</div>
        </div>
        </div>
        <form className="page-actions" onSubmit={submitSearch}>
          <div className="field" style={{ margin: 0 }}>
            <input placeholder="Search e.g. paneer, chicken, dal" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn primary sm" type="submit">Search</button>
        </form>
      </header>

      <div className="page-body">
        <div className="chips">
          {dietCategory && (
            <button className={`chip ${filter.category === dietCategory ? 'on' : ''}`} onClick={() => setFilter({ category: dietCategory })}>
              {dietCategory}
            </button>
          )}
          {CUISINES.map(c => (
            <button key={c} className={`chip ${filter.area === c ? 'on' : ''}`} onClick={() => setFilter({ area: c })}>{c}</button>
          ))}
        </div>

        <div className="card-h" style={{ marginBottom: 0 }}>
          <h3>{heading}</h3>
          {recipes && <span className="label">{recipes.length} recipes</span>}
        </div>

        {error && <div className="alert">{error}</div>}

        {recipes === null ? (
          <div className="recipe-grid">
            {Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton" style={{ height: 220 }} />)}
          </div>
        ) : recipes.length === 0 ? (
          !error && <div className="card empty"><div className="ic"><Pulse mood="eat" size={92} /></div><h3>No <span className="serif-it">recipes</span> found</h3><p>Try another search or cuisine.</p></div>
        ) : (
          <div className="recipe-grid">
            {recipes.map(r => (
              <button key={r.id} className="card recipe-card" onClick={() => openRecipe(r)} disabled={opening}>
                <img src={`${r.image}/medium`} alt="" loading="lazy" />
                <div className="rc-body">
                  <div className="rc-name">{r.name}</div>
                  {(r.area || r.category) && <span className="label">{[r.area, r.category].filter(Boolean).join(' · ')}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setOpen(null)}>
          <div className="modal" style={{ maxWidth: 680 }}>
            <div className="modal-head">
              <div className="modal-title">{open.name}</div>
              <button className="icon-btn" onClick={() => setOpen(null)} title="Close">✕</button>
            </div>
            <img src={open.image} alt="" style={{ width: '100%', borderRadius: 16, aspectRatio: '16 / 9', objectFit: 'cover' }} />
            <div className="chips" style={{ margin: '14px 0' }}>
              {open.area && <span className="pill out">{open.area}</span>}
              {open.category && <span className="pill out">{open.category}</span>}
            </div>
            <h3 className="field-label" style={{ marginBottom: 8 }}>Ingredients</h3>
            <ul className="ingredients">
              {open.ingredients.map((ing, i) => <li key={i}>{ing.measure} {ing.name}</li>)}
            </ul>
            <h3 className="field-label" style={{ margin: '18px 0 8px' }}>Method</h3>
            <div className="instructions">{open.instructions}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
              {open.youtube && <a className="btn primary sm" href={open.youtube} target="_blank" rel="noopener noreferrer">▶ Watch video</a>}
              {open.source && <a className="btn ghost sm" href={open.source} target="_blank" rel="noopener noreferrer">Original recipe ↗</a>}
            </div>
            <p className="label" style={{ marginTop: 14 }}>Recipe data: TheMealDB · no nutrition info — log it in Nutrition once cooked</p>
          </div>
        </div>
      )}
    </div>
  );
}
