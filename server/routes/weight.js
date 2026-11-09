const router = require('express').Router();
const { body, query } = require('express-validator');
const auth = require('../middleware/auth');
const WeightLog = require('../models/WeightLog');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { validate, dateParam, dateBody, DATE_FORMAT } = require('../middleware/validate');

// Weigh-ins are sparse (people don't weigh daily), so the history window is
// wider than other metrics: up to a year for the 90D/1Y trend views.
const MAX_DAYS = 366;

const daysBefore = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

// Moving average over the previous `window` entries (by entry, not calendar day).
// Smooths daily water-weight swings so the trend line shows real progress.
const withTrend = (logs, window = 7) => logs.map((log, i) => {
  const slice = logs.slice(Math.max(0, i - window + 1), i + 1);
  const avg = slice.reduce((s, l) => s + l.weight, 0) / slice.length;
  return { ...log, trend: Math.round(avg * 10) / 10 };
});

// Copy the newest weigh-in onto the profile and recompute calorie/macro targets.
const syncProfileWeight = async (userId) => {
  const latest = await WeightLog.findOne({ user: userId }).sort({ date: -1 });
  if (!latest) return null;
  const user = await User.findById(userId);
  if (user.profile.weight === latest.weight) return user;
  user.profile.weight = latest.weight;
  user.applyTargets();
  await user.save();
  return user;
};

// GET /api/weight/history?endDate=YYYY-MM-DD&days=90
router.get('/history', auth, validate([
  query('endDate').optional().matches(DATE_FORMAT).withMessage('endDate must be YYYY-MM-DD'),
  query('days').optional().isInt({ min: 1, max: MAX_DAYS }).withMessage(`days must be 1–${MAX_DAYS}`).toInt(),
]), asyncHandler(async (req, res) => {
  const end = req.query.endDate || new Date().toISOString().slice(0, 10);
  const days = req.query.days || 30;
  const logs = await WeightLog.find({
    user: req.user._id,
    date: { $gte: daysBefore(end, days - 1), $lte: end },
  }).sort({ date: 1 }).lean();

  const entries = withTrend(logs);
  const first = entries[0];
  const last = entries[entries.length - 1];
  res.json({
    entries,
    summary: {
      count: entries.length,
      start: first?.weight ?? null,
      latest: last?.weight ?? null,
      change: first && last ? Math.round((last.weight - first.weight) * 10) / 10 : null,
      min: entries.length ? Math.min(...entries.map(e => e.weight)) : null,
      max: entries.length ? Math.max(...entries.map(e => e.weight)) : null,
      targetWeight: req.user.profile?.targetWeight ?? null,
    },
  });
}));

// GET /api/weight/latest → newest weigh-in or null
router.get('/latest', auth, asyncHandler(async (req, res) => {
  const log = await WeightLog.findOne({ user: req.user._id }).sort({ date: -1 });
  res.json(log || null);
}));

// POST /api/weight  { date, weight, bodyFat?, note? }  (upsert by date)
router.post('/', auth, validate([
  dateBody(),
  body('weight').isFloat({ min: 20, max: 400 }).withMessage('Weight must be 20–400 kg').toFloat(),
  body('bodyFat').optional({ values: 'falsy' }).isFloat({ min: 2, max: 70 }).withMessage('Body fat must be 2–70%').toFloat(),
  body('note').optional().isString().isLength({ max: 200 }).withMessage('Note must be 200 characters or fewer'),
]), asyncHandler(async (req, res) => {
  const { date, weight, bodyFat, note } = req.body;
  const update = { weight, note, source: 'manual' };
  if (bodyFat) update.bodyFat = bodyFat;
  const log = await WeightLog.findOneAndUpdate(
    { user: req.user._id, date },
    { $set: update, $setOnInsert: { user: req.user._id, date } },
    { new: true, upsert: true, runValidators: true },
  );
  const user = await syncProfileWeight(req.user._id);
  res.status(201).json({ log, user });
}));

// DELETE /api/weight/:date
router.delete('/:date', auth, validate([dateParam()]), asyncHandler(async (req, res) => {
  const deleted = await WeightLog.findOneAndDelete({ user: req.user._id, date: req.params.date });
  if (!deleted) return res.status(404).json({ message: 'No weigh-in on that date' });
  const user = await syncProfileWeight(req.user._id);
  res.json({ message: 'Deleted', user });
}));

module.exports = router;
module.exports.withTrend = withTrend;
