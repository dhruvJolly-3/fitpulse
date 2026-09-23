const express = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const { SleepLog, WaterLog, StepsLog } = require('../models/Metrics');
const asyncHandler = require('../utils/asyncHandler');
const { validate, dateParam, dateBody, startDateQuery, mongoIdParam } = require('../middleware/validate');

const DRINK_TYPES = ['water', 'green_tea', 'coffee', 'juice', 'sports_drink', 'other'];

// ---- WATER ----
const waterRouter = express.Router();

waterRouter.get('/history/week', auth, validate([startDateQuery()]), asyncHandler(async (req, res) => {
  const logs = await WaterLog.find({ user: req.user._id, date: { $gte: req.query.startDate } }).sort({ date: 1 }).limit(7);
  res.json(logs);
}));

waterRouter.get('/:date', auth, validate([dateParam()]), asyncHandler(async (req, res) => {
  let log = await WaterLog.findOne({ user: req.user._id, date: req.params.date });
  if (!log) log = { date: req.params.date, entries: [], total: 0, target: req.user.waterTarget || 2500 };
  res.json(log);
}));

waterRouter.post('/:date/add', auth, validate([
  dateParam(),
  body('amount').isInt({ min: 1, max: 5000 }).withMessage('Amount must be 1–5000 ml').toInt(),
  body('type').optional().isIn(DRINK_TYPES).withMessage('Invalid drink type'),
  body('time').optional().isISO8601().withMessage('time must be an ISO date'),
]), asyncHandler(async (req, res) => {
  let log = await WaterLog.findOne({ user: req.user._id, date: req.params.date });
  if (!log) log = new WaterLog({ user: req.user._id, date: req.params.date, entries: [], target: req.user.waterTarget });
  const { amount, type, time } = req.body;
  log.entries.push({ amount, type, time });
  log.total = log.entries.reduce((s, e) => s + e.amount, 0);
  await log.save();
  res.json(log);
}));

waterRouter.delete('/:date/entry/:entryId', auth, validate([dateParam(), mongoIdParam('entryId')]), asyncHandler(async (req, res) => {
  const log = await WaterLog.findOne({ user: req.user._id, date: req.params.date });
  if (!log) return res.status(404).json({ message: 'Not found' });
  log.entries = log.entries.filter(e => e._id.toString() !== req.params.entryId);
  log.total = log.entries.reduce((s, e) => s + e.amount, 0);
  await log.save();
  res.json(log);
}));

// ---- SLEEP ----
const sleepRouter = express.Router();

sleepRouter.get('/history/week', auth, validate([startDateQuery()]), asyncHandler(async (req, res) => {
  const logs = await SleepLog.find({ user: req.user._id, date: { $gte: req.query.startDate } }).sort({ date: 1 }).limit(7);
  res.json(logs);
}));

sleepRouter.get('/:date', auth, validate([dateParam()]), asyncHandler(async (req, res) => {
  const log = await SleepLog.findOne({ user: req.user._id, date: req.params.date });
  res.json(log || null);
}));

sleepRouter.post('/', auth, validate([
  dateBody(),
  body('duration').isFloat({ min: 0, max: 24 }).withMessage('Duration must be 0–24 hours').toFloat(),
  body('quality').optional().isInt({ min: 1, max: 5 }).withMessage('Quality must be 1–5').toInt(),
  body('bedtime').optional().isISO8601().withMessage('bedtime must be an ISO date'),
  body('wakeTime').optional().isISO8601().withMessage('wakeTime must be an ISO date'),
  body('notes').optional().isString().isLength({ max: 500 }).withMessage('Notes must be 500 characters or fewer'),
]), asyncHandler(async (req, res) => {
  // `user` is set last so a client can never write to another user's log
  const data = { ...req.body, user: req.user._id };
  const existing = await SleepLog.findOne({ user: req.user._id, date: req.body.date });
  if (existing) {
    const updated = await SleepLog.findByIdAndUpdate(existing._id, data, { new: true, runValidators: true });
    return res.json(updated);
  }
  const log = await SleepLog.create(data);
  res.status(201).json(log);
}));

// ---- STEPS ----
const stepsRouter = express.Router();

stepsRouter.get('/history/week', auth, validate([startDateQuery()]), asyncHandler(async (req, res) => {
  const logs = await StepsLog.find({ user: req.user._id, date: { $gte: req.query.startDate } }).sort({ date: 1 }).limit(7);
  res.json(logs);
}));

stepsRouter.get('/:date', auth, validate([dateParam()]), asyncHandler(async (req, res) => {
  const log = await StepsLog.findOne({ user: req.user._id, date: req.params.date });
  res.json(log || { date: req.params.date, steps: 0, caloriesBurnt: 0 });
}));

stepsRouter.post('/', auth, validate([
  dateBody(),
  body('steps').isInt({ min: 0, max: 200000 }).withMessage('Steps must be 0–200,000').toInt(),
  body('distance').optional().isFloat({ min: 0, max: 200 }).withMessage('Distance must be 0–200 km').toFloat(),
  body('caloriesBurnt').optional().isInt({ min: 0, max: 20000 }).withMessage('Calories must be 0–20,000').toInt(),
  body('activeMinutes').optional().isInt({ min: 0, max: 1440 }).withMessage('Active minutes must be 0–1440').toInt(),
]), asyncHandler(async (req, res) => {
  const data = { ...req.body, user: req.user._id };
  const existing = await StepsLog.findOne({ user: req.user._id, date: req.body.date });
  if (existing) {
    const updated = await StepsLog.findByIdAndUpdate(existing._id, data, { new: true, runValidators: true });
    return res.json(updated);
  }
  const log = await StepsLog.create(data);
  res.status(201).json(log);
}));

module.exports = { waterRouter, sleepRouter, stepsRouter };
