const router = require('express').Router();
const crypto = require('crypto');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const User = require('../models/User');
const PushSubscription = require('../models/PushSubscription');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const { sendToUser, webPushReady } = require('../utils/notify');
const { runReminders, KINDS } = require('../services/reminders');

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const timeRule = (path) => body(path).optional().matches(TIME).withMessage(`${path} must be HH:mm`);
const onRule = (path) => body(path).optional().isBoolean().withMessage(`${path} must be true or false`).toBoolean();

// GET /api/reminders/config → what this server supports + the VAPID public key
router.get('/config', (req, res) => {
  res.json({ webPush: webPushReady(), vapidPublicKey: process.env.VAPID_PUBLIC_KEY || null, kinds: KINDS });
});

// GET /api/reminders/settings
router.get('/settings', auth, asyncHandler(async (req, res) => {
  const devices = await PushSubscription.countDocuments({ user: req.user._id });
  res.json({ reminders: req.user.reminders, timezone: req.user.timezone, devices });
}));

// PUT /api/reminders/settings  (partial update of user.reminders + timezone)
router.put('/settings', auth, validate([
  onRule('enabled'),
  ...KINDS.map(k => onRule(`${k}.on`)),
  ...['workout', 'meals', 'sleep', 'weighIn'].map(k => timeRule(`${k}.time`)),
  timeRule('water.from'), timeRule('water.to'),
  body('water.everyHours').optional().isInt({ min: 1, max: 6 }).withMessage('water.everyHours must be 1–6').toInt(),
  body('timezone').optional().custom((tz) => {
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
  }).withMessage('Invalid timezone'),
]), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const b = req.body;
  if (b.enabled !== undefined) user.reminders.enabled = b.enabled;
  for (const kind of KINDS) {
    if (!b[kind]) continue;
    for (const field of ['on', 'time', 'from', 'to', 'everyHours']) {
      if (b[kind][field] !== undefined && user.reminders[kind][field] !== undefined) user.reminders[kind][field] = b[kind][field];
    }
  }
  if (user.reminders.water.to <= user.reminders.water.from) { // 'HH:mm' strings compare correctly
    return res.status(400).json({ message: 'Water reminders must end after they start' });
  }
  if (b.timezone) user.timezone = b.timezone;
  await user.save();
  res.json({ reminders: user.reminders, timezone: user.timezone });
}));

// POST /api/reminders/devices  { type: 'web', subscription } | { type: 'expo', token }
router.post('/devices', auth, validate([
  body('type').isIn(['web', 'expo']).withMessage('type must be web or expo'),
  body('subscription.endpoint').if(body('type').equals('web')).isURL({ protocols: ['https'], require_tld: false }).withMessage('Invalid push subscription'),
  body('subscription.keys.p256dh').if(body('type').equals('web')).isString().notEmpty(),
  body('subscription.keys.auth').if(body('type').equals('web')).isString().notEmpty(),
  body('token').if(body('type').equals('expo')).matches(/^Expo(nent)?PushToken\[[^\]]+\]$/).withMessage('Invalid Expo push token'),
]), asyncHandler(async (req, res) => {
  const { type } = req.body;
  const endpoint = type === 'web' ? req.body.subscription.endpoint : req.body.token;
  // Upsert by endpoint: re-subscribing the same browser/phone moves it to this user
  await PushSubscription.findOneAndUpdate(
    { endpoint },
    {
      user: req.user._id, type, endpoint,
      keys: type === 'web' ? req.body.subscription.keys : undefined,
      userAgent: String(req.get('user-agent') || '').slice(0, 200),
    },
    { upsert: true, new: true },
  );
  const devices = await PushSubscription.countDocuments({ user: req.user._id });
  res.status(201).json({ message: 'Device registered', devices });
}));

// DELETE /api/reminders/devices  { endpoint }  (web endpoint or Expo token)
router.delete('/devices', auth, validate([
  body('endpoint').isString().notEmpty().withMessage('endpoint is required'),
]), asyncHandler(async (req, res) => {
  await PushSubscription.deleteOne({ user: req.user._id, endpoint: req.body.endpoint });
  const devices = await PushSubscription.countDocuments({ user: req.user._id });
  res.json({ message: 'Device removed', devices });
}));

// POST /api/reminders/test → send a test notification to all my devices
router.post('/test', auth, asyncHandler(async (req, res) => {
  const result = await sendToUser(req.user._id, {
    title: 'FitPulse reminders are on ✅',
    body: "This is how your reminders will look. We'll only nudge you when you're behind.",
    url: '/profile',
    tag: 'fitpulse-test',
  });
  if (!result.devices) return res.status(400).json({ message: 'No devices registered yet. Turn on notifications first.' });
  res.json(result);
}));

// POST /api/reminders/run  (header X-Cron-Secret) → evaluate everyone now.
// Called by the scheduled GitHub Action, which also wakes Render's free tier.
const safeEqual = (a, b) => {
  const ab = Buffer.from(String(a)); const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};
router.post('/run', asyncHandler(async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ message: 'CRON_SECRET is not set on this server' });
  if (!safeEqual(req.get('x-cron-secret') || '', secret)) return res.status(401).json({ message: 'Invalid cron secret' });
  // Tests can pin the clock; production always uses the real time
  const now = process.env.NODE_ENV === 'test' && req.body?.now ? new Date(req.body.now) : new Date();
  res.json(await runReminders(now));
}));

module.exports = router;
