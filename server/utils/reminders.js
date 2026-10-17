// Smart reminders: which reminders a user should get, and when.
// "Smart" = a reminder is skipped when its goal is already met:
//   water    → only if intake is behind the day's pace (or the target)
//   meals    → only if nothing is logged for that meal yet
//   workout  → only if no workout / rest day is logged today
//   weigh-in → only if no weigh-in today
//   bedtime  → always (a nudge to wind down)
// Web Push uses runScheduler(); the mobile apps fetch planFor() and schedule
// the same reminders as on-device notifications.
const webpush = require('web-push');
const User = require('../models/User');
const NutritionLog = require('../models/NutritionLog');
const { WaterLog } = require('../models/Metrics');
const { WorkoutLog } = require('../models/Training');
const WeightLog = require('../models/WeightLog');
const PushSubscription = require('../models/PushSubscription');

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const toTime = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

const isValidTimezone = (tz) => { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; } };

// Local calendar date + minutes-past-midnight for an instant in a timezone
const localParts = (instant, tz) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
};

// UTC instant for a local date + 'HH:MM' in a timezone (handles DST)
const instantFor = (date, time, tz) => {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const asLocal = (t) => { const lp = localParts(new Date(t), tz); const [ly, lmo, ld] = lp.date.split('-').map(Number); return Date.UTC(ly, lmo - 1, ld, Math.floor(lp.minutes / 60), lp.minutes % 60); };
  const offset = asLocal(guess) - guess;
  return new Date(guess - offset);
};

const addDays = (date, n) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// Every reminder slot in one day for these settings
const slotsFor = (r) => {
  if (!r?.enabled) return [];
  const out = [];
  if (r.water?.on) {
    const from = toMin(r.water.from), to = toMin(r.water.to), step = Math.max(1, r.water.everyHours) * 60;
    for (let m = from, i = 0; m <= to; m += step, i++) {
      out.push({ key: `water-${i}`, type: 'water', time: toTime(m), frac: to > from ? (m - from) / (to - from) : 1, title: 'Time for some water 💧', url: '/water' });
    }
  }
  if (r.meals?.on) {
    for (const meal of ['breakfast', 'lunch', 'dinner']) {
      out.push({ key: `meal-${meal}`, type: 'meal', meal, time: r.meals[meal], title: `Log your ${meal} 🍽️`, url: '/nutrition' });
    }
  }
  if (r.workout?.on) out.push({ key: 'workout', type: 'workout', time: r.workout.time, title: 'Workout time 🏋️', url: '/training' });
  if (r.weighIn?.on) out.push({ key: 'weigh-in', type: 'weighIn', time: r.weighIn.time, title: 'Morning weigh-in ⚖️', url: '/progress' });
  if (r.bedtime?.on) out.push({ key: 'bedtime', type: 'bedtime', time: r.bedtime.time, title: 'Wind down for sleep 🌙', url: '/sleep' });
  return out.filter(s => TIME.test(s.time)).sort((a, b) => toMin(a.time) - toMin(b.time));
};

// What the user has logged today, loaded once per check
const loadDay = async (user, date) => {
  const [water, nutrition, workout, weight] = await Promise.all([
    WaterLog.findOne({ user: user._id, date }).lean(),
    NutritionLog.findOne({ user: user._id, date }).lean(),
    WorkoutLog.findOne({ user: user._id, date }).lean(),
    WeightLog.findOne({ user: user._id, date }).lean(),
  ]);
  return { water, nutrition, workout, weight };
};

// Is this reminder still useful? Returns the body text, or null to skip it.
const messageFor = (slot, day, user) => {
  const target = user.waterTarget || 2500;
  switch (slot.type) {
    case 'water': {
      const total = day.water?.total || 0;
      const pace = Math.round(target * slot.frac);
      // Skip when the goal is met, or when they're already on pace (but always
      // nudge if nothing has been logged yet, e.g. the first slot of the day)
      if (total >= target || (total > 0 && total >= pace)) return null;
      return `${(total / 1000).toFixed(1)} L of ${(target / 1000).toFixed(1)} L so far. A glass now keeps you on track.`;
    }
    case 'meal':
      if ((day.nutrition?.foods || []).some(f => f.mealType === slot.meal)) return null;
      return `Nothing logged for ${slot.meal} yet. It takes 10 seconds.`;
    case 'workout':
      if (day.workout) return null;
      return "Today's session is waiting. Even 20 minutes counts.";
    case 'weighIn':
      if (day.weight) return null;
      return 'Step on the scale before breakfast for the most consistent trend.';
    case 'bedtime':
      return `Aim for ${user.sleepTarget || 8} hours tonight. Screens off soon.`;
    default:
      return null;
  }
};

// Upcoming reminders for the next `days` days, for on-device scheduling.
// Today's slots are filtered by what's already logged; later days include all.
const planFor = async (user, now = new Date(), days = 2) => {
  const tz = isValidTimezone(user.timezone) ? user.timezone : 'UTC';
  const slots = slotsFor(user.reminders);
  if (!slots.length) return [];
  const { date: today, minutes } = localParts(now, tz);
  const day = await loadDay(user, today);
  const plan = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    for (const slot of slots) {
      if (i === 0 && toMin(slot.time) <= minutes) continue;
      // Future days: assume nothing is logged yet
      const body = messageFor(slot, i === 0 ? day : {}, user);
      if (!body) continue;
      plan.push({ id: `${date}:${slot.key}`, at: instantFor(date, slot.time, tz).toISOString(), title: slot.title, body, url: slot.url });
    }
  }
  return plan;
};

// ---- Web Push ----
const pushConfigured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
let vapidSet = false;
const ensureVapid = () => {
  if (vapidSet || !pushConfigured()) return pushConfigured();
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@fitpulse.app', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  vapidSet = true;
  return true;
};

// Send to every device of a user; drop subscriptions the browser has revoked
const sendToUser = async (userId, payload) => {
  if (!ensureVapid()) return 0;
  const subs = await PushSubscription.find({ user: userId });
  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload), { TTL: 3600 });
      sent++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) await s.deleteOne();
    }
  }));
  return sent;
};

// Once a minute: send any web-push reminder that is due now and still useful.
// Note: on a free hosting tier that sleeps when idle, reminders only go out
// while the server is awake; the mobile apps schedule on the device instead.
const sentRecently = new Map(); // `${user}:${date}:${slot}` → timestamp
const tick = async (now = new Date()) => {
  const userIds = await PushSubscription.distinct('user');
  if (!userIds.length) return;
  const users = await User.find({ _id: { $in: userIds }, 'reminders.enabled': true });
  for (const user of users) {
    const tz = isValidTimezone(user.timezone) ? user.timezone : 'UTC';
    const { date, minutes } = localParts(now, tz);
    const due = slotsFor(user.reminders).filter(s => toMin(s.time) === minutes);
    if (!due.length) continue;
    const day = await loadDay(user, date);
    for (const slot of due) {
      const key = `${user._id}:${date}:${slot.key}`;
      if (sentRecently.has(key)) continue;
      const body = messageFor(slot, day, user);
      sentRecently.set(key, Date.now());
      if (body) await sendToUser(user._id, { title: slot.title, body, url: slot.url, tag: slot.key });
    }
  }
  for (const [k, t] of sentRecently) if (Date.now() - t > 2 * 864e5) sentRecently.delete(k);
};

const startScheduler = () => {
  if (!pushConfigured()) return null;
  const timer = setInterval(() => tick().catch(err => console.error('Reminder tick failed:', err.message)), 60 * 1000);
  timer.unref();
  return timer;
};

module.exports = { slotsFor, planFor, messageFor, localParts, instantFor, isValidTimezone, pushConfigured, sendToUser, tick, startScheduler, TIME };
