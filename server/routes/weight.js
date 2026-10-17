const router = require('express').Router();
const { body, query } = require('express-validator');
const auth = require('../middleware/auth');
const User = require('../models/User');
const WeightLog = require('../models/WeightLog');
const asyncHandler = require('../utils/asyncHandler');
const { validate, dateParam, dateBody } = require('../middleware/validate');

// The newest weigh-in becomes the profile weight, so TDEE, calorie and macro
// targets follow the user's real weight over time.
const syncProfileWeight = async (userId) => {
  const latest = await WeightLog.findOne({ user: userId }).sort({ date: -1 });
  if (!latest) return null;
  const user = await User.findById(userId);
  if (user.profile.weight !== latest.weight) {
    user.profile.weight = latest.weight;
    user.applyTargets();
    await user.save();
  }
  return user;
};

// GET /api/weight?days=90 → weigh-ins from the last N days, oldest first
router.get('/', auth, validate([
  query('days').optional().isInt({ min: 1, max: 730 }).withMessage('days must be 1–730').toInt(),
]), asyncHandler(async (req, res) => {
  const days = req.query.days || 90;
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const logs = await WeightLog.find({ user: req.user._id, date: { $gte: since } }).sort({ date: 1 });
  res.json(logs);
}));

// POST /api/weight { date, weight, note? } → add or replace that day's weigh-in
router.post('/', auth, validate([
  dateBody(),
  body('weight').isFloat({ min: 20, max: 400 }).withMessage('Weight must be 20–400 kg').toFloat(),
  body('note').optional().isString().isLength({ max: 200 }).withMessage('Note must be 200 characters or fewer'),
]), asyncHandler(async (req, res) => {
  const { date, weight, note } = req.body;
  const log = await WeightLog.findOneAndUpdate(
    { user: req.user._id, date },
    { weight: Math.round(weight * 10) / 10, note, source: 'manual' },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  const user = await syncProfileWeight(req.user._id);
  res.status(201).json({ log, dailyCalorieTarget: user?.dailyCalorieTarget, macroTargets: user?.macroTargets });
}));

router.delete('/:date', auth, validate([dateParam()]), asyncHandler(async (req, res) => {
  const gone = await WeightLog.findOneAndDelete({ user: req.user._id, date: req.params.date });
  if (!gone) return res.status(404).json({ message: 'No weigh-in on that date' });
  await syncProfileWeight(req.user._id);
  res.json({ deleted: req.params.date });
}));

module.exports = router;
module.exports.syncProfileWeight = syncProfileWeight;
