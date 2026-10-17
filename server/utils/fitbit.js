// Fitbit (Google) Web API client: OAuth token exchange/refresh and a 7-day
// sync of steps, sleep, workouts and weight into FitPulse's own logs.
// Docs: https://dev.fitbit.com/build/reference/web-api/
// Base URLs are configurable so tests can point them at a local fake.
const User = require('../models/User');
const { StepsLog, SleepLog } = require('../models/Metrics');
const { WorkoutLog } = require('../models/Training');
const WeightLog = require('../models/WeightLog');

const AUTH_URL = () => process.env.FITBIT_AUTH_URL || 'https://www.fitbit.com/oauth2/authorize';
const API = () => (process.env.FITBIT_API_BASE || 'https://api.fitbit.com').replace(/\/$/, '');
const SCOPES = 'activity sleep weight heartrate profile';

const configured = () => Boolean(process.env.FITBIT_CLIENT_ID && process.env.FITBIT_CLIENT_SECRET && process.env.FITBIT_REDIRECT_URI);

const authorizeUrl = (state) => `${AUTH_URL()}?${new URLSearchParams({
  response_type: 'code', client_id: process.env.FITBIT_CLIENT_ID, redirect_uri: process.env.FITBIT_REDIRECT_URI,
  scope: SCOPES, state, prompt: 'consent',
})}`;

const fail = (message, status = 502) => Object.assign(new Error(message), { status });

const tokenRequest = async (params) => {
  const basic = Buffer.from(`${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`).toString('base64');
  const r = await fetch(`${API()}/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params), signal: AbortSignal.timeout(15000),
  }).catch(() => null);
  if (!r) throw fail('Could not reach Fitbit');
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw fail(r.status === 400 || r.status === 401 ? 'Fitbit access was revoked. Connect again.' : 'Fitbit sign-in failed', r.status === 401 || r.status === 400 ? 409 : 502);
  return data;
};

const saveTokens = (user, t) => {
  user.fitbit.userId = t.user_id || user.fitbit.userId;
  user.fitbit.accessToken = t.access_token;
  user.fitbit.refreshToken = t.refresh_token;
  user.fitbit.expiresAt = new Date(Date.now() + (t.expires_in || 28800) * 1000);
};

// Code from the OAuth callback → tokens stored on the user
const connect = async (userId, code) => {
  const t = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: process.env.FITBIT_REDIRECT_URI });
  const user = await User.findById(userId);
  if (!user) throw fail('User not found', 404);
  saveTokens(user, t);
  await user.save();
};

const loadWithTokens = (userId) => User.findById(userId).select('+fitbit.accessToken +fitbit.refreshToken');

// A valid access token, refreshing it when it's about to expire
const accessToken = async (user) => {
  if (!user.fitbit?.refreshToken) throw fail('Fitbit is not connected', 409);
  if (user.fitbit.expiresAt && user.fitbit.expiresAt.getTime() - Date.now() > 60_000) return user.fitbit.accessToken;
  const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: user.fitbit.refreshToken });
  saveTokens(user, t);
  await user.save();
  return user.fitbit.accessToken;
};

const apiGet = async (token, path) => {
  const r = await fetch(`${API()}${path}`, { headers: { Authorization: `Bearer ${token}`, 'Accept-Language': 'en_GB' }, signal: AbortSignal.timeout(15000) }).catch(() => null);
  if (!r) throw fail('Could not reach Fitbit');
  if (r.status === 401) throw fail('Fitbit access was revoked. Connect again.', 409);
  if (r.status === 429) throw fail('Fitbit rate limit reached. Try again in an hour.', 429);
  if (!r.ok) throw fail('Fitbit returned an error');
  return r.json();
};

const ymd = (d) => d.toISOString().slice(0, 10);

// Pull the last `days` days and merge into FitPulse logs. Never lowers a
// value the user typed by hand; Fitbit workouts are added once (by logId).
const sync = async (userId, days = 7) => {
  const user = await loadWithTokens(userId);
  if (!user) throw fail('User not found', 404);
  const token = await accessToken(user);
  const end = new Date(), start = new Date(Date.now() - (days - 1) * 864e5);
  const s = ymd(start), e = ymd(end);

  const [steps, distance, activeCals, sleep, activities, weight] = await Promise.all([
    apiGet(token, `/1/user/-/activities/steps/date/${s}/${e}.json`),
    apiGet(token, `/1/user/-/activities/distance/date/${s}/${e}.json`),
    apiGet(token, `/1/user/-/activities/activityCalories/date/${s}/${e}.json`),
    apiGet(token, `/1.2/user/-/sleep/date/${s}/${e}.json`),
    apiGet(token, `/1/user/-/activities/list.json?afterDate=${s}&sort=asc&offset=0&limit=50`),
    apiGet(token, `/1/user/-/body/log/weight/date/${s}/${e}.json`),
  ]);
  const counts = { steps: 0, sleep: 0, workouts: 0, weight: 0 };

  // Steps, distance, active calories (one row per day)
  const byDate = (arr) => Object.fromEntries((arr || []).map(x => [x.dateTime, Number(x.value)]));
  const dist = byDate(distance['activities-distance']), cals = byDate(activeCals['activities-activityCalories']);
  for (const { dateTime: date, value } of steps['activities-steps'] || []) {
    const n = Number(value);
    if (!n) continue;
    const log = await StepsLog.findOne({ user: userId, date }) || new StepsLog({ user: userId, date });
    log.steps = Math.max(log.steps || 0, n);
    if (dist[date]) log.distance = Math.max(log.distance || 0, Math.round(dist[date] * 100) / 100);
    if (cals[date]) log.caloriesBurnt = Math.max(log.caloriesBurnt || 0, Math.round(cals[date]));
    await log.save(); counts.steps++;
  }

  // Main sleep of each night
  for (const night of (sleep.sleep || []).filter(x => x.isMainSleep !== false)) {
    const log = await SleepLog.findOne({ user: userId, date: night.dateOfSleep }) || new SleepLog({ user: userId, date: night.dateOfSleep });
    log.duration = Math.round((night.minutesAsleep / 60) * 10) / 10;
    log.bedtime = new Date(night.startTime);
    log.wakeTime = new Date(night.endTime);
    const lv = night.levels?.summary || {};
    if (lv.deep) log.deepSleep = Math.round((lv.deep.minutes / 60) * 10) / 10;
    if (lv.rem) log.remSleep = Math.round((lv.rem.minutes / 60) * 10) / 10;
    if (lv.wake) log.awakeTime = lv.wake.minutes;
    await log.save(); counts.sleep++;
  }

  // Workouts → today's training log, tagged so they're only added once
  for (const a of activities.activities || []) {
    const date = String(a.startTime).slice(0, 10);
    const tag = `fitbit:${a.logId}`;
    let log = await WorkoutLog.findOne({ user: userId, date });
    if (log?.exercises.some(x => x.notes === tag)) continue;
    if (!log) log = new WorkoutLog({ user: userId, date, dayLabel: `${a.activityName} (Fitbit)`, exercises: [] });
    const minutes = Math.round((a.activeDuration || a.duration || 0) / 60000);
    log.exercises.push({
      name: a.activityName, category: 'cardio', duration: minutes, distance: a.distance || undefined,
      caloriesBurnt: a.calories || 0, completed: true, notes: tag,
    });
    log.totalCaloriesBurnt = (log.totalCaloriesBurnt || 0) + (a.calories || 0);
    log.totalDuration = (log.totalDuration || 0) + minutes;
    if (a.averageHeartRate) log.heartRateAvg = a.averageHeartRate;
    log.completedAt = log.completedAt || new Date(a.startTime);
    await log.save(); counts.workouts++;
  }

  // Weigh-ins (a manual entry for the same day wins)
  for (const w of weight.weight || []) {
    const existing = await WeightLog.findOne({ user: userId, date: w.date });
    if (existing && existing.source === 'manual') continue;
    await WeightLog.findOneAndUpdate({ user: userId, date: w.date }, { weight: Math.round(w.weight * 10) / 10, source: 'fitbit' }, { upsert: true, setDefaultsOnInsert: true });
    counts.weight++;
  }

  user.fitbit.lastSyncAt = new Date();
  await user.save();
  return counts;
};

const disconnect = async (userId) => {
  const user = await loadWithTokens(userId);
  if (user?.fitbit?.accessToken) {
    const basic = Buffer.from(`${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`).toString('base64');
    await fetch(`${API()}/oauth2/revoke`, {
      method: 'POST', headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: user.fitbit.refreshToken || user.fitbit.accessToken }), signal: AbortSignal.timeout(10000),
    }).catch(() => {}); // best effort
  }
  if (user) { user.fitbit = {}; await user.save(); }
};

module.exports = { configured, authorizeUrl, connect, sync, disconnect };
