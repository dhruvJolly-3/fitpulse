const User = require('../models/User');
const { WaterLog } = require('../models/Metrics');
const NutritionLog = require('../models/NutritionLog');
const { WorkoutLog } = require('../models/Training');
const WeightLog = require('../models/WeightLog');
const { sendToUser } = require('../utils/notify');

// "Smart" reminders: each one fires at its scheduled time in the user's own
// timezone, but only when it's actually useful. A water reminder is skipped
// if the user is on pace for their target, a workout reminder if today's
// session is already logged, and so on.
//
// runReminders() is idempotent: it can be called every few minutes (by the
// in-process ticker while the API is awake, and by the scheduled GitHub
// Action that also wakes Render's free tier). Each slot is sent at most once,
// tracked in user.reminderState.

// A slot still counts as "due" this long after its time, so a late cron run
// (GitHub's scheduler can lag) still delivers it.
const WINDOW_MIN = 45;

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};
const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// Local date ('YYYY-MM-DD') and minutes since midnight in a timezone
const localClock = (now, timeZone) => {
  let parts;
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(now);
  } catch {
    return localClock(now, 'Asia/Kolkata');
  }
  const get = (t) => parts.find(p => p.type === t).value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
};

// All of today's slot times (minutes) for one reminder kind
const slotsFor = (kind, cfg) => {
  if (kind !== 'water') {
    const t = toMinutes(cfg.time);
    return t == null ? [] : [t];
  }
  const from = toMinutes(cfg.from); const to = toMinutes(cfg.to);
  const step = Math.max(1, Math.min(6, cfg.everyHours || 2)) * 60;
  if (from == null || to == null || to <= from) return [];
  const out = [];
  for (let t = from; t <= to; t += step) out.push(t);
  return out;
};

const dueSlot = (slots, minutes) => {
  const past = slots.filter(s => s <= minutes && minutes - s < WINDOW_MIN);
  return past.length ? past[past.length - 1] : null;
};

const litres = (ml) => `${(ml / 1000).toFixed(1)} L`;

// Each check returns a { title, body, url } to send, or null to skip
const CHECKS = {
  async water(user, date, minutes) {
    const cfg = user.reminders.water;
    const from = toMinutes(cfg.from); const to = toMinutes(cfg.to);
    const target = user.waterTarget || 2500;
    const log = await WaterLog.findOne({ user: user._id, date });
    const total = log?.total || 0;
    // Where they "should" be by now if they spread the target across the window
    const pace = Math.min(1, Math.max(0, (minutes - from) / Math.max(1, to - from)));
    const expected = Math.round(target * Math.max(pace, 0.15));
    if (total >= target || total >= expected * 0.9) return null;
    return {
      title: 'Time for some water 💧',
      body: `You're at ${litres(total)} of ${litres(target)}. A 250 ml glass now keeps you on pace.`,
      url: '/water',
    };
  },
  async workout(user, date) {
    if (await WorkoutLog.exists({ user: user._id, date })) return null;
    return {
      title: "Today's workout isn't logged yet 🏋️",
      body: 'Even a 20-minute session counts. Log it (or mark a rest day) to keep your streak honest.',
      url: '/training',
    };
  },
  async meals(user, date) {
    const log = await NutritionLog.findOne({ user: user._id, date });
    const kcal = Math.round(log?.totals?.calories || 0);
    const target = user.dailyCalorieTarget || 2000;
    if (kcal >= target * 0.5) return null;
    return {
      title: 'Finish logging today’s food 🍽️',
      body: kcal ? `${kcal} of ${target} kcal logged so far. Add the rest so tomorrow's targets stay accurate.` : 'Nothing logged today yet. It takes under a minute with search or barcode scan.',
      url: '/nutrition',
    };
  },
  async sleep(user) {
    const hours = user.sleepTarget || 8;
    return {
      title: 'Wind down for bed 🌙',
      body: `Lights out soon to get your ${hours} h. Screens off, and log last night's sleep if you haven't.`,
      url: '/sleep',
    };
  },
  async weighIn(user, date) {
    if (await WeightLog.exists({ user: user._id, date })) return null;
    return {
      title: 'Morning weigh-in ⚖️',
      body: 'Same time, before breakfast, gives the cleanest trend. Takes 10 seconds.',
      url: '/weight',
    };
  },
};

const KINDS = Object.keys(CHECKS);

// Evaluate one user; returns the reminders sent
const runForUser = async (user, now) => {
  const { date, minutes } = localClock(now, user.timezone || 'Asia/Kolkata');
  const sent = [];
  let stateChanged = false;
  for (const kind of KINDS) {
    const cfg = user.reminders?.[kind];
    if (!cfg?.on) continue;
    const slot = dueSlot(slotsFor(kind, cfg), minutes);
    if (slot == null) continue;
    const key = `${date}T${toHHMM(slot)}`;
    if (user.reminderState?.get(kind) === key) continue; // already handled this slot
    user.reminderState.set(kind, key);
    stateChanged = true;
    const msg = await CHECKS[kind](user, date, minutes);
    if (!msg) continue;
    const result = await sendToUser(user._id, { ...msg, tag: `fitpulse-${kind}` });
    sent.push({ user: String(user._id), kind, slot: key, ...msg, ...result });
  }
  if (stateChanged) await User.updateOne({ _id: user._id }, { $set: { reminderState: user.reminderState } });
  return sent;
};

const runReminders = async (now = new Date()) => {
  const users = await User.find({ 'reminders.enabled': true }).select('+reminderState');
  const sent = [];
  for (const user of users) {
    try {
      sent.push(...await runForUser(user, now));
    } catch (err) {
      console.error(`Reminders failed for user ${user._id}:`, err.message);
    }
  }
  return { checkedUsers: users.length, sent };
};

module.exports = { runReminders, localClock, slotsFor, dueSlot, KINDS };
