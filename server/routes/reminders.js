const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const User = require('../models/User');
const PushSubscription = require('../models/PushSubscription');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const { planFor, pushConfigured, sendToUser, isValidTimezone, TIME } = require('../utils/reminders');

const time = (field) => body(field).optional().matches(TIME).withMessage(`${field} must be HH:MM (24h)`);
const flag = (field) => body(field).optional().isBoolean().withMessage(`${field} must be true or false`).toBoolean();

const settingsOf = (user) => ({
  reminders: user.reminders,
  timezone: user.timezone,
  push: { configured: pushConfigured(), publicKey: process.env.VAPID_PUBLIC_KEY || null },
});

// GET /api/reminders/settings
router.get('/settings', auth, (req, res) => res.json(settingsOf(req.user)));

// PUT /api/reminders/settings { reminders: {...}, timezone }
router.put('/settings', auth, validate([
  body('reminders').optional().isObject(),
  flag('reminders.enabled'),
  flag('reminders.water.on'), body('reminders.water.everyHours').optional().isInt({ min: 1, max: 6 }).withMessage('Water reminders every 1–6 hours').toInt(),
  time('reminders.water.from'), time('reminders.water.to'),
  flag('reminders.meals.on'), time('reminders.meals.breakfast'), time('reminders.meals.lunch'), time('reminders.meals.dinner'),
  flag('reminders.workout.on'), time('reminders.workout.time'),
  flag('reminders.weighIn.on'), time('reminders.weighIn.time'),
  flag('reminders.bedtime.on'), time('reminders.bedtime.time'),
  body('timezone').optional().isString().custom(isValidTimezone).withMessage('Unknown timezone'),
]), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const r = req.body.reminders || {};
  // Copy only known fields
  if (r.enabled !== undefined) user.reminders.enabled = r.enabled;
  for (const [group, fields] of Object.entries({
    water: ['on', 'everyHours', 'from', 'to'], meals: ['on', 'breakfast', 'lunch', 'dinner'],
    workout: ['on', 'time'], weighIn: ['on', 'time'], bedtime: ['on', 'time'],
  })) {
    for (const f of fields) if (r[group]?.[f] !== undefined) user.reminders[group][f] = r[group][f];
  }
  if (user.reminders.water.from >= user.reminders.water.to) {
    return res.status(400).json({ message: 'Water reminders: "from" must be earlier than "to"' });
  }
  if (req.body.timezone) user.timezone = req.body.timezone;
  await user.save();
  res.json(settingsOf(user));
}));

// GET /api/reminders/plan → upcoming reminders (today's skip what's already done).
// The mobile apps schedule these as on-device notifications.
router.get('/plan', auth, asyncHandler(async (req, res) => {
  res.json(await planFor(req.user));
}));

// Web Push subscription for this browser
router.post('/subscribe', auth, validate([
  body('endpoint').isURL({ protocols: ['https'], require_tld: false }).withMessage('Invalid push endpoint'),
  body('keys.p256dh').isString().isLength({ min: 20, max: 200 }).withMessage('Invalid push key'),
  body('keys.auth').isString().isLength({ min: 8, max: 100 }).withMessage('Invalid push key'),
]), asyncHandler(async (req, res) => {
  if (!pushConfigured()) return res.status(503).json({ message: 'Push notifications are not set up on the server yet' });
  const { endpoint, keys } = req.body;
  await PushSubscription.findOneAndUpdate({ endpoint }, { user: req.user._id, endpoint, keys }, { upsert: true, setDefaultsOnInsert: true });
  res.status(201).json({ subscribed: true });
}));

router.delete('/subscribe', auth, validate([
  body('endpoint').isString().notEmpty().withMessage('endpoint is required'),
]), asyncHandler(async (req, res) => {
  await PushSubscription.deleteOne({ endpoint: req.body.endpoint, user: req.user._id });
  res.json({ subscribed: false });
}));

// Send a test notification to every browser this user subscribed
router.post('/test', auth, asyncHandler(async (req, res) => {
  if (!pushConfigured()) return res.status(503).json({ message: 'Push notifications are not set up on the server yet' });
  const sent = await sendToUser(req.user._id, { title: 'FitPulse reminders are on ✅', body: "You'll get nudges only when you're behind on a goal.", url: '/' });
  res.json({ sent });
}));

module.exports = router;
