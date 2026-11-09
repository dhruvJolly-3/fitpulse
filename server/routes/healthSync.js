const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const { StepsLog, SleepLog } = require('../models/Metrics');
const { WorkoutLog } = require('../models/Training');
const WeightLog = require('../models/WeightLog');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { validate, DATE_FORMAT } = require('../middleware/validate');

// Health sync from the mobile app.
//
// Google Fit's APIs are being shut down; on Android the replacement is Health
// Connect, and on iPhone it is Apple Health (HealthKit). Both keep data on the
// phone with no web/server API, so the FitPulse mobile app reads them on the
// device and posts daily summaries here. One endpoint serves both platforms.
//
// Merge rules (so a sync never destroys something the user typed in):
//   steps   → keep whichever count is higher (phones under-count less than people guess)
//   sleep   → only fills days with no manual sleep log
//   weight  → only fills days with no manual weigh-in
//   workouts→ added to that day's workout log, deduplicated by the platform's record id
const SOURCES = ['health_connect', 'apple_health'];
const MAX_DAYS = 31;

const round = (n, dp = 1) => (Number.isFinite(n) ? Math.round(n * 10 ** dp) / 10 ** dp : undefined);

router.post('/', auth, validate([
  body('source').isIn(SOURCES).withMessage('source must be health_connect or apple_health'),
  body('days').isArray({ min: 1, max: MAX_DAYS }).withMessage(`days must be an array of 1–${MAX_DAYS} entries`),
  body('days.*.date').matches(DATE_FORMAT).withMessage('each day needs a date in YYYY-MM-DD format'),
  body('days.*.steps').optional().isInt({ min: 0, max: 200000 }).toInt(),
  body('days.*.distanceKm').optional().isFloat({ min: 0, max: 300 }).toFloat(),
  body('days.*.activeCalories').optional().isFloat({ min: 0, max: 20000 }).toFloat(),
  body('days.*.weightKg').optional().isFloat({ min: 20, max: 400 }).toFloat(),
  body('days.*.sleep.durationHours').optional().isFloat({ min: 0, max: 24 }).toFloat(),
  body('days.*.sleep.bedtime').optional().isISO8601(),
  body('days.*.sleep.wakeTime').optional().isISO8601(),
  body('days.*.workouts').optional().isArray({ max: 20 }),
  body('days.*.workouts.*.id').optional().isString().isLength({ max: 200 }),
  body('days.*.workouts.*.type').optional().isString().isLength({ max: 60 }),
  body('days.*.workouts.*.start').optional().isISO8601(),
  body('days.*.workouts.*.end').optional().isISO8601(),
  body('days.*.workouts.*.calories').optional().isFloat({ min: 0, max: 10000 }).toFloat(),
  body('days.*.workouts.*.distanceKm').optional().isFloat({ min: 0, max: 500 }).toFloat(),
]), asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const source = req.body.source;
  const summary = { steps: 0, sleep: 0, weight: 0, workouts: 0, skipped: 0 };

  for (const day of req.body.days) {
    const { date } = day;

    if (day.steps != null) {
      const existing = await StepsLog.findOne({ user: userId, date });
      if (!existing || existing.steps < day.steps || existing.source !== 'manual') {
        await StepsLog.findOneAndUpdate(
          { user: userId, date },
          {
            $set: {
              steps: day.steps,
              distance: round(day.distanceKm, 2),
              caloriesBurnt: day.activeCalories != null ? Math.round(day.activeCalories) : undefined,
              source,
              fromAppleHealth: source === 'apple_health',
            },
            $setOnInsert: { user: userId, date },
          },
          { upsert: true },
        );
        summary.steps++;
      } else summary.skipped++;
    }

    if (day.sleep?.durationHours) {
      const existing = await SleepLog.findOne({ user: userId, date });
      if (!existing || existing.source !== 'manual') {
        await SleepLog.findOneAndUpdate(
          { user: userId, date },
          {
            $set: {
              duration: round(day.sleep.durationHours, 2),
              bedtime: day.sleep.bedtime, wakeTime: day.sleep.wakeTime,
              source, fromAppleHealth: source === 'apple_health',
            },
            $setOnInsert: { user: userId, date },
          },
          { upsert: true },
        );
        summary.sleep++;
      } else summary.skipped++;
    }

    if (day.weightKg) {
      const existing = await WeightLog.findOne({ user: userId, date });
      if (!existing) {
        await WeightLog.create({ user: userId, date, weight: round(day.weightKg), source });
        summary.weight++;
      } else summary.skipped++;
    }

    if (day.workouts?.length) {
      let log = await WorkoutLog.findOne({ user: userId, date });
      if (!log) log = new WorkoutLog({ user: userId, date, dayLabel: 'Synced workout', exercises: [], synced: [] });
      const known = new Set((log.synced || []).map(w => w.externalId));
      for (const w of day.workouts) {
        const externalId = w.id || `${w.type}-${w.start}`;
        if (known.has(externalId)) continue;
        const durationMin = w.start && w.end ? round((new Date(w.end) - new Date(w.start)) / 60000, 0) : undefined;
        log.synced.push({ externalId, type: w.type || 'workout', start: w.start, end: w.end, durationMin, calories: w.calories, distanceKm: w.distanceKm, source });
        known.add(externalId);
        summary.workouts++;
      }
      // Synced workouts add to the day's totals (and so count for the streak)
      log.totalDuration = (log.exercises || []).reduce((s, e) => s + (e.duration || 0), 0)
        + log.synced.reduce((s, w) => s + (w.durationMin || 0), 0);
      log.totalCaloriesBurnt = (log.exercises || []).reduce((s, e) => s + (e.caloriesBurnt || 0), 0)
        + log.synced.reduce((s, w) => s + (w.calories || 0), 0);
      log.isRestDay = false;
      log.isOffDay = false;
      await log.save();
    }
  }

  await User.updateOne({ _id: userId }, { $set: { healthSync: { source, lastSyncAt: new Date() }, appleHealthSync: source === 'apple_health' } });
  res.json({ message: 'Synced', summary, lastSyncAt: new Date() });
}));

// GET /api/health-sync/status → which platform last synced and when
router.get('/status', auth, (req, res) => {
  res.json(req.user.healthSync || {});
});

module.exports = router;
