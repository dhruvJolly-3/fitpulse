const router = require('express').Router();
const { body, query } = require('express-validator');
const auth = require('../middleware/auth');
const { WorkoutLog, TrainingProgram } = require('../models/Training');
const asyncHandler = require('../utils/asyncHandler');
const { validate, dateParam, dateBody, mongoIdParam, DATE_FORMAT } = require('../middleware/validate');

const programRules = [
  body('name').optional().isString().isLength({ max: 100 }),
  body('daysPerWeek').optional().isInt({ min: 1, max: 7 }).withMessage('daysPerWeek must be 1–7').toInt(),
  body('durationWeeks').optional().isInt({ min: 1, max: 52 }).withMessage('durationWeeks must be 1–52').toInt(),
  body('schedule').optional().isArray({ max: 7 }).withMessage('schedule must be an array of up to 7 days'),
];

// --- Training Programs ---
router.get('/programs', auth, asyncHandler(async (req, res) => {
  const programs = await TrainingProgram.find({ user: req.user._id });
  res.json(programs);
}));

router.post('/programs', auth, validate(programRules), asyncHandler(async (req, res) => {
  // `user` is set last so a client can never create data for another user
  const program = await TrainingProgram.create({ ...req.body, user: req.user._id });
  res.status(201).json(program);
}));

router.put('/programs/:id', auth, validate([mongoIdParam('id'), ...programRules]), asyncHandler(async (req, res) => {
  const program = await TrainingProgram.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { ...req.body, user: req.user._id }, { new: true, runValidators: true }
  );
  if (!program) return res.status(404).json({ message: 'Program not found' });
  res.json(program);
}));

// --- Workout Logs ---
router.get('/logs', auth, validate([
  query('startDate').optional().matches(DATE_FORMAT).withMessage('startDate must be YYYY-MM-DD'),
  query('endDate').optional().matches(DATE_FORMAT).withMessage('endDate must be YYYY-MM-DD'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1–100').toInt(),
]), asyncHandler(async (req, res) => {
  const { startDate, endDate, limit = 30 } = req.query;
  const query = { user: req.user._id };
  if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate };
  const logs = await WorkoutLog.find(query).sort({ date: -1 }).limit(Number(limit));
  res.json(logs);
}));

router.get('/logs/:date', auth, validate([dateParam()]), asyncHandler(async (req, res) => {
  const log = await WorkoutLog.findOne({ user: req.user._id, date: req.params.date });
  res.json(log || null);
}));

router.post('/logs', auth, validate([
  dateBody(),
  body('isRestDay').optional().isBoolean().toBoolean(),
  body('isOffDay').optional().isBoolean().toBoolean(),
  body('exercises').optional().isArray({ max: 50 }).withMessage('exercises must be an array'),
  body('totalCaloriesBurnt').optional().isFloat({ min: 0 }).toFloat(),
  body('totalDuration').optional().isFloat({ min: 0 }).toFloat(),
  body('perceivedExertion').optional().isInt({ min: 1, max: 10 }).withMessage('perceivedExertion must be 1–10').toInt(),
  body('mood').optional().isIn(['great', 'good', 'okay', 'tired', 'sick']).withMessage('Invalid mood'),
]), asyncHandler(async (req, res) => {
  const data = { ...req.body, user: req.user._id };
  const existing = await WorkoutLog.findOne({ user: req.user._id, date: req.body.date });
  if (existing) {
    const updated = await WorkoutLog.findByIdAndUpdate(existing._id, data, { new: true, runValidators: true });
    return res.json(updated);
  }
  const log = await WorkoutLog.create(data);
  res.status(201).json(log);
}));

// Get streak
router.get('/streak', auth, asyncHandler(async (req, res) => {
  const logs = await WorkoutLog.find({ user: req.user._id, isOffDay: false }).sort({ date: -1 });
  let streak = 0;
  let currentDate = new Date();
  for (const log of logs) {
    const logDate = new Date(log.date);
    const diff = Math.floor((currentDate - logDate) / (1000 * 60 * 60 * 24));
    if (diff <= 1) { streak++; currentDate = logDate; }
    else break;
  }
  res.json({ streak, totalWorkouts: logs.length });
}));

module.exports = router;
