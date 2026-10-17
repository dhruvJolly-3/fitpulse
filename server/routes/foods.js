const router = require('express').Router();
const { query, param } = require('express-validator');
const auth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const cache = require('../utils/cache');

// Food database backed by Open Food Facts (https://world.openfoodfacts.org):
// free, no API key, millions of packaged foods with barcodes and nutrition
// per 100 g. OFF asks every app to send a descriptive User-Agent.
const BASE = () => (process.env.OFF_BASE_URL || 'https://world.openfoodfacts.org').replace(/\/$/, '');
const UA = 'FitPulse/1.0 (https://github.com/dhruvJolly-3/fitpulse)';
const FIELDS = 'code,product_name,product_name_en,brands,image_small_url,nutriments,serving_size,serving_quantity';
const TTL = 12 * 60 * 60 * 1000; // 12h

const num = (v) => (v == null || v === '' || !Number.isFinite(+v) ? null : Math.round(+v * 10) / 10);

// Normalise an OFF product to what the app needs. Values are per 100 g / ml.
const toFood = (p) => {
  const n = p.nutriments || {};
  const kcal = n['energy-kcal_100g'] ?? (n.energy_100g != null ? n.energy_100g / 4.184 : null);
  return {
    code: p.code,
    name: (p.product_name_en || p.product_name || '').trim(),
    brand: (p.brands || '').split(',')[0].trim() || null,
    image: p.image_small_url || null,
    per100g: {
      calories: num(kcal), protein: num(n.proteins_100g), carbs: num(n.carbohydrates_100g),
      fat: num(n.fat_100g), fiber: num(n.fiber_100g), sugar: num(n.sugars_100g),
      sodium: n.sodium_100g != null ? num(n.sodium_100g * 1000) : null, // g → mg
    },
    serving: p.serving_quantity ? { label: p.serving_size || `${p.serving_quantity} g`, grams: num(p.serving_quantity) } : null,
  };
};
// Only foods we can actually log (a name and a calorie value)
const usable = (f) => f.name && f.per100g.calories != null;

const offGet = async (path) => {
  const url = BASE() + path;
  const cached = cache.get(url);
  if (cached) return cached;
  let r;
  try {
    r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
  } catch {
    r = null;
  }
  if (!r || (!r.ok && r.status !== 404)) {
    const err = new Error('The food database is unavailable right now. Try again, or use Custom entry.');
    err.status = 502;
    throw err;
  }
  const data = r.status === 404 ? { status: 0 } : await r.json();
  cache.set(url, data, TTL);
  return data;
};

// GET /api/foods/search?q=greek yogurt → up to 20 foods
router.get('/search', auth, validate([
  query('q').trim().isLength({ min: 2, max: 80 }).withMessage('Search must be 2–80 characters'),
]), asyncHandler(async (req, res) => {
  const qs = new URLSearchParams({ search_terms: req.query.q, search_simple: '1', action: 'process', json: '1', page_size: '24', fields: FIELDS });
  const data = await offGet(`/cgi/search.pl?${qs}`);
  res.json((data.products || []).map(toFood).filter(usable).slice(0, 20));
}));

// GET /api/foods/barcode/8901058000290 → one food, or 404
router.get('/barcode/:code', auth, validate([
  param('code').matches(/^\d{6,14}$/).withMessage('Barcode must be 6–14 digits'),
]), asyncHandler(async (req, res) => {
  const data = await offGet(`/api/v2/product/${req.params.code}.json?fields=${FIELDS}`);
  const food = data.status === 1 && data.product ? toFood({ code: req.params.code, ...data.product }) : null;
  if (!food || !usable(food)) return res.status(404).json({ message: 'No nutrition info for this barcode yet. Add it with Custom entry.' });
  res.json(food);
}));

module.exports = router;
module.exports.toFood = toFood;
