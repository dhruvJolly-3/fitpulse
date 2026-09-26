const router = require('express').Router();
const { query, param } = require('express-validator');
const auth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const cache = require('../utils/cache');

// Recipe search backed by TheMealDB (https://www.themealdb.com/api.php).
// The public test key "1" works for development; set MEALDB_API_KEY to a
// supporter key for production use. TheMealDB has no calorie/macro data,
// so recipes are for ideas + instructions, not for logging nutrition.
const BASE = () => `https://www.themealdb.com/api/json/v1/${process.env.MEALDB_API_KEY || '1'}`;
const TTL = 6 * 60 * 60 * 1000; // 6h

// Normalise TheMealDB's strIngredient1..20 / strMeasure1..20 columns into a list.
const toRecipe = (m) => ({
  id: m.idMeal,
  name: m.strMeal,
  category: m.strCategory || null,
  area: m.strArea || null,
  image: m.strMealThumb,
  instructions: m.strInstructions || null,
  youtube: m.strYoutube || null,
  source: m.strSource || null,
  ingredients: Array.from({ length: 20 }, (_, i) => ({
    name: (m[`strIngredient${i + 1}`] || '').trim(),
    measure: (m[`strMeasure${i + 1}`] || '').trim(),
  })).filter(x => x.name),
});

const fetchJson = async (url) => {
  const cached = cache.get(url);
  if (cached) return cached;
  const r = await fetch(url);
  if (!r.ok) {
    const err = new Error('Recipe service is unavailable right now');
    err.status = 502;
    throw err;
  }
  const data = await r.json();
  cache.set(url, data, TTL);
  return data;
};

// GET /api/recipes/search?q=paneer        → full recipes matching a name
// GET /api/recipes/search?area=Indian     → recipes from a cuisine (summary only)
// GET /api/recipes/search?category=Vegetarian
router.get('/search', auth, validate([
  query('q').optional().trim().isLength({ min: 2, max: 60 }).withMessage('Search must be 2–60 characters'),
  query('area').optional().trim().isAlpha('en-US', { ignore: ' ' }).isLength({ max: 30 }).withMessage('Invalid cuisine'),
  query('category').optional().trim().isAlpha('en-US', { ignore: ' ' }).isLength({ max: 30 }).withMessage('Invalid category'),
]), asyncHandler(async (req, res) => {
  const { q, area, category } = req.query;
  let url;
  if (q) url = `${BASE()}/search.php?s=${encodeURIComponent(q)}`;
  else if (area) url = `${BASE()}/filter.php?a=${encodeURIComponent(area)}`;
  else if (category) url = `${BASE()}/filter.php?c=${encodeURIComponent(category)}`;
  else return res.status(400).json({ message: 'Provide q, area or category' });

  const data = await fetchJson(url);
  // filter.php only returns id/name/thumb; the client fetches details on click.
  res.json((data.meals || []).slice(0, 24).map(toRecipe));
}));

// GET /api/recipes/:id → one full recipe (ingredients + instructions)
router.get('/:id', auth, validate([
  param('id').isInt().withMessage('Invalid recipe id'),
]), asyncHandler(async (req, res) => {
  const data = await fetchJson(`${BASE()}/lookup.php?i=${req.params.id}`);
  const meal = data.meals?.[0];
  if (!meal) return res.status(404).json({ message: 'Recipe not found' });
  res.json(toRecipe(meal));
}));

module.exports = router;
