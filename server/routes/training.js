const router = require('express').Router();
const auth = require('../middleware/auth');
const { WorkoutLog, TrainingProgram } = require('../models/Training');

// --- Training Programs ---
router.get('/programs', auth, async (req, res) => {
  const programs = await TrainingProgram.find({ user: req.user._id });
  res.json(programs);
});

router.post('/programs', auth, async (req, res) => {
  try {
    const program = await TrainingProgram.create({ user: req.user._id, ...req.body });
    res.status(201).json(program);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/programs/:id', auth, async (req, res) => {
  try {
    const program = await TrainingProgram.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body, { new: true }
    );
    res.json(program);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- Workout Logs ---
router.get('/logs', auth, async (req, res) => {
  try {
    const { startDate, endDate, limit = 30 } = req.query;
    const query = { user: req.user._id };
    if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate };
    const logs = await WorkoutLog.find(query).sort({ date: -1 }).limit(Number(limit));
    res.json(logs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/logs/:date', auth, async (req, res) => {
  try {
    const log = await WorkoutLog.findOne({ user: req.user._id, date: req.params.date });
    res.json(log || null);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/logs', auth, async (req, res) => {
  try {
    const existing = await WorkoutLog.findOne({ user: req.user._id, date: req.body.date });
    if (existing) {
      const updated = await WorkoutLog.findByIdAndUpdate(existing._id, req.body, { new: true });
      return res.json(updated);
    }
    const log = await WorkoutLog.create({ user: req.user._id, ...req.body });
    res.status(201).json(log);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get streak
router.get('/streak', auth, async (req, res) => {
  try {
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
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
