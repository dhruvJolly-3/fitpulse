const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const NutritionLog = require('../models/NutritionLog');
const asyncHandler = require('../utils/asyncHandler');
const { validate, dateParam, startDateQuery, daysQuery, mongoIdParam } = require('../middleware/validate');

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout'];

const recalcTotals = (foods) => {
  return foods.reduce((acc, f) => ({
    calories: acc.calories + (f.calories || 0),
    protein: acc.protein + (f.protein || 0),
    carbs: acc.carbs + (f.carbs || 0),
    fat: acc.fat + (f.fat || 0),
    fiber: acc.fiber + (f.fiber || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
};

const nonNegative = (field) =>
  body(field).optional().isFloat({ min: 0, max: 10000 }).withMessage(`${field} must be a positive number`).toFloat();

// Get weekly summary
router.get('/summary/week', auth, validate([startDateQuery(), daysQuery()]), asyncHandler(async (req, res) => {
  const logs = await NutritionLog.find({
    user: req.user._id,
    date: { $gte: req.query.startDate }
  }).sort({ date: 1 }).limit(req.query.days || 7); // ?days=30 for the month view
  res.json(logs);
}));

// Get log for date
router.get('/:date', auth, validate([dateParam()]), asyncHandler(async (req, res) => {
  let log = await NutritionLog.findOne({ user: req.user._id, date: req.params.date });
  if (!log) log = { date: req.params.date, foods: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 } };
  res.json(log);
}));

// Add food entry
router.post('/:date/food', auth, validate([
  dateParam(),
  body('name').trim().notEmpty().withMessage('Food name is required')
    .isLength({ max: 120 }).withMessage('Food name must be 120 characters or fewer'),
  body('mealType').isIn(MEAL_TYPES).withMessage('Invalid meal type'),
  body('calories').isFloat({ min: 0, max: 10000 }).withMessage('Calories must be 0–10000').toFloat(),
  nonNegative('protein'), nonNegative('carbs'), nonNegative('fat'),
  nonNegative('fiber'), nonNegative('sugar'), nonNegative('sodium'), nonNegative('quantity'),
]), asyncHandler(async (req, res) => {
  let log = await NutritionLog.findOne({ user: req.user._id, date: req.params.date });
  if (!log) log = new NutritionLog({ user: req.user._id, date: req.params.date, foods: [] });
  log.foods.push(req.body);
  log.totals = recalcTotals(log.foods);
  log.netCalories = log.totals.calories - (log.caloriesBurnt || 0);
  await log.save();
  res.json(log);
}));

// Delete food entry
router.delete('/:date/food/:foodId', auth, validate([dateParam(), mongoIdParam('foodId')]), asyncHandler(async (req, res) => {
  const log = await NutritionLog.findOne({ user: req.user._id, date: req.params.date });
  if (!log) return res.status(404).json({ message: 'Log not found' });
  log.foods = log.foods.filter(f => f._id.toString() !== req.params.foodId);
  log.totals = recalcTotals(log.foods);
  await log.save();
  res.json(log);
}));

module.exports = router;
