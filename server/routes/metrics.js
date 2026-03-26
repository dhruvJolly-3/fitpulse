const router = require('express').Router();
const auth = require('../middleware/auth');
const { SleepLog, WaterLog, StepsLog } = require('../models/Metrics');

// ---- WATER ----
const waterRouter = require('express').Router();

waterRouter.get('/:date', auth, async (req, res) => {
  let log = await WaterLog.findOne({ user: req.user._id, date: req.params.date });
  if (!log) log = { date: req.params.date, entries: [], total: 0, target: req.user.waterTarget || 2500 };
  res.json(log);
});

waterRouter.post('/:date/add', auth, async (req, res) => {
  try {
    let log = await WaterLog.findOne({ user: req.user._id, date: req.params.date });
    if (!log) log = new WaterLog({ user: req.user._id, date: req.params.date, entries: [], target: req.user.waterTarget });
    log.entries.push(req.body);
    log.total = log.entries.reduce((s, e) => s + e.amount, 0);
    await log.save();
    res.json(log);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

waterRouter.delete('/:date/entry/:entryId', auth, async (req, res) => {
  try {
    const log = await WaterLog.findOne({ user: req.user._id, date: req.params.date });
    if (!log) return res.status(404).json({ message: 'Not found' });
    log.entries = log.entries.filter(e => e._id.toString() !== req.params.entryId);
    log.total = log.entries.reduce((s, e) => s + e.amount, 0);
    await log.save();
    res.json(log);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ---- SLEEP ----
const sleepRouter = require('express').Router();

sleepRouter.get('/:date', auth, async (req, res) => {
  const log = await SleepLog.findOne({ user: req.user._id, date: req.params.date });
  res.json(log || null);
});

sleepRouter.post('/', auth, async (req, res) => {
  try {
    const existing = await SleepLog.findOne({ user: req.user._id, date: req.body.date });
    if (existing) {
      const updated = await SleepLog.findByIdAndUpdate(existing._id, req.body, { new: true });
      return res.json(updated);
    }
    const log = await SleepLog.create({ user: req.user._id, ...req.body });
    res.status(201).json(log);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

sleepRouter.get('/history/week', auth, async (req, res) => {
  const { startDate } = req.query;
  const logs = await SleepLog.find({ user: req.user._id, date: { $gte: startDate } }).sort({ date: 1 }).limit(7);
  res.json(logs);
});

// ---- STEPS ----
const stepsRouter = require('express').Router();

stepsRouter.get('/:date', auth, async (req, res) => {
  const log = await StepsLog.findOne({ user: req.user._id, date: req.params.date });
  res.json(log || { date: req.params.date, steps: 0, caloriesBurnt: 0 });
});

stepsRouter.post('/', auth, async (req, res) => {
  try {
    const existing = await StepsLog.findOne({ user: req.user._id, date: req.body.date });
    if (existing) {
      const updated = await StepsLog.findByIdAndUpdate(existing._id, req.body, { new: true });
      return res.json(updated);
    }
    const log = await StepsLog.create({ user: req.user._id, ...req.body });
    res.status(201).json(log);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

stepsRouter.get('/history/week', auth, async (req, res) => {
  const { startDate } = req.query;
  const logs = await StepsLog.find({ user: req.user._id, date: { $gte: startDate } }).sort({ date: 1 }).limit(7);
  res.json(logs);
});

module.exports = { waterRouter, sleepRouter, stepsRouter };
