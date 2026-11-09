const router = require('express').Router();
const { query, param } = require('express-validator');
const auth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const cache = require('../utils/cache');
const { FOODS } = require('../data/foods');

// Food search and barcode lookup.
//   1. Built-in list of Indian home-cooked foods (data/foods.js), always on.
//   2. Open Food Facts (https://world.openfoodfacts.org), the open packaged-
//      food database: free, no key, ~3M products incl. Indian brands.
// Set FOOD_API=off to run with the built-in list only (tests, offline dev).
const OFF_BASE = process.env.OFF_BASE_URL || 'https://world.openfoodfacts.org';
const OFF_FIELDS = 'code,product_name,product_name_en,brands,nutriments,serving_size,serving_quantity,image_small_url';
// Open Food Facts asks every client to identify itself in the User-Agent
const USER_AGENT = `FitPulse/1.0 (${process.env.OFF_CONTACT || 'https://github.com/dhruvJolly-3/fitpulse'})`;
const TTL = 12 * 60 * 60 * 1000; // product data barely changes; cache for 12h
const remoteEnabled = () => process.env.FOOD_API !== 'off';

const num = (v) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
};

// Open Food Facts product → the same shape as the built-in foods.
// Returns null when a product has no usable calorie data (common for
// community-entered records), so the client never logs a 0-kcal ghost item.
const fromOpenFoodFacts = (p) => {
  const n = p.nutriments || {};
  let calories = num(n['energy-kcal_100g']);
  if (calories == null && num(n.energy_100g) != null) calories = num(n.energy_100g / 4.184); // kJ → kcal
  if (calories == null) return null;
  const servingGrams = num(p.serving_quantity);
  return {
    id: `off-${p.code}`,
    name: (p.product_name || p.product_name_en || '').trim() || 'Unnamed product',
    brand: (p.brands || '').split(',')[0].trim() || null,
    source: 'openfoodfacts',
    barcode: p.code || null,
    image: p.image_small_url || null,
    serving: servingGrams ? { label: p.serving_size || `${servingGrams} g`, grams: servingGrams } : { label: '100 g', grams: 100 },
    per100g: {
      calories,
      protein: num(n.proteins_100g) ?? 0,
      carbs: num(n.carbohydrates_100g) ?? 0,
      fat: num(n.fat_100g) ?? 0,
      fiber: num(n.fiber_100g) ?? 0,
      sugar: num(n.sugars_100g) ?? 0,
      sodium: n.sodium_100g != null ? num(n.sodium_100g * 1000) : null, // g → mg
    },
  };
};

const offFetch = async (path) => {
  const url = `${OFF_BASE}${path}`;
  const cached = cache.get(url);
  if (cached) return cached;
  let r;
  try {
    r = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(8000) });
  } catch {
    r = null;
  }
  if (!r || (!r.ok && r.status !== 404)) {
    const err = new Error('Food database is unavailable right now. Try again, or add the food manually.');
    err.status = 502;
    throw err;
  }
  const data = r.status === 404 ? { status: 0 } : await r.json();
  cache.set(url, data, TTL);
  return data;
};

const localSearch = (q) => {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return FOODS.filter(f => words.every(w => f.name.toLowerCase().includes(w)));
};

// GET /api/foods/search?q=paneer → built-in matches first, then packaged foods
router.get('/search', auth, validate([
  query('q').trim().isLength({ min: 2, max: 60 }).withMessage('Search must be 2–60 characters'),
]), asyncHandler(async (req, res) => {
  const q = req.query.q;
  const local = localSearch(q);
  let remote = [];
  let remoteError = null;
  if (remoteEnabled()) {
    try {
      const data = await offFetch(`/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&fields=${OFF_FIELDS}`);
      remote = (data.products || []).map(fromOpenFoodFacts).filter(Boolean);
    } catch (err) {
      remoteError = err.message; // still return the built-in matches
    }
  }
  res.json({ results: [...local, ...remote].slice(0, 30), remoteError });
}));

// GET /api/foods/barcode/:code → one packaged product by EAN/UPC barcode
router.get('/barcode/:code', auth, validate([
  param('code').matches(/^\d{6,14}$/).withMessage('Barcode must be 6–14 digits'),
]), asyncHandler(async (req, res) => {
  if (!remoteEnabled()) return res.status(503).json({ message: 'Barcode lookup is turned off on this server' });
  const data = await offFetch(`/api/v2/product/${req.params.code}?fields=${OFF_FIELDS}`);
  const food = data.status === 1 && data.product ? fromOpenFoodFacts({ code: req.params.code, ...data.product }) : null;
  if (!food) return res.status(404).json({ message: 'Product not found. Add it as a custom food instead.' });
  res.json(food);
}));

module.exports = router;
module.exports.fromOpenFoodFacts = fromOpenFoodFacts;
module.exports.localSearch = localSearch;
