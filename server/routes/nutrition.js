const router = require('express').Router();
const auth = require('../middleware/auth');
const NutritionLog = require('../models/NutritionLog');

const recalcTotals = (foods) => {
  return foods.reduce((acc, f) => ({
    calories: acc.calories + (f.calories || 0),
    protein: acc.protein + (f.protein || 0),
    carbs: acc.carbs + (f.carbs || 0),
    fat: acc.fat + (f.fat || 0),
    fiber: acc.fiber + (f.fiber || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
};

// Get log for date
router.get('/:date', auth, async (req, res) => {
  try {
    let log = await NutritionLog.findOne({ user: req.user._id, date: req.params.date });
    if (!log) log = { date: req.params.date, foods: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 } };
    res.json(log);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Add food entry
router.post('/:date/food', auth, async (req, res) => {
  try {
    let log = await NutritionLog.findOne({ user: req.user._id, date: req.params.date });
    if (!log) log = new NutritionLog({ user: req.user._id, date: req.params.date, foods: [] });
    log.foods.push(req.body);
    log.totals = recalcTotals(log.foods);
    log.netCalories = log.totals.calories - (log.caloriesBurnt || 0);
    await log.save();
    res.json(log);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Delete food entry
router.delete('/:date/food/:foodId', auth, async (req, res) => {
  try {
    const log = await NutritionLog.findOne({ user: req.user._id, date: req.params.date });
    if (!log) return res.status(404).json({ message: 'Log not found' });
    log.foods = log.foods.filter(f => f._id.toString() !== req.params.foodId);
    log.totals = recalcTotals(log.foods);
    await log.save();
    res.json(log);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get weekly summary
router.get('/summary/week', auth, async (req, res) => {
  try {
    const { startDate } = req.query;
    const logs = await NutritionLog.find({
      user: req.user._id,
      date: { $gte: startDate }
    }).sort({ date: 1 }).limit(7);
    res.json(logs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
