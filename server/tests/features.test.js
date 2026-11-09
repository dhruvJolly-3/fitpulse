// API tests for the roadmap features: weight log, progress photos, food
// search / barcode, smart reminders and health sync.
// Run:  cd server && TEST_MONGODB_URI=mongodb://127.0.0.1:27017/fitpulse_test npm test
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const { fromOpenFoodFacts } = require('../routes/foods');
const { localClock, slotsFor, dueSlot } = require('../services/reminders');

const MONGO = (process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/fitpulse_test') + '_features';
const PORT = 5098;
const BASE = `http://127.0.0.1:${PORT}/api`;
const CRON_SECRET = 'cron-test-secret';
let server, serverLog = '';

const daysAgo = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
const today = daysAgo(0);

const call = async (method, url, { token, body, headers = {} } = {}) => {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const type = res.headers.get('content-type') || '';
  let data = null;
  if (type.includes('json')) data = await res.json();
  else if (type.startsWith('image/')) data = Buffer.from(await res.arrayBuffer());
  return { status: res.status, body: data, type };
};

let n = 0;
const newUser = async (profile = { age: 25, gender: 'male', height: 175, weight: 80, goal: 'lose_weight' }) => {
  const r = await call('POST', '/auth/register', { body: { name: 'Feature User', email: `f${++n}@test.dev`, password: 'secret123' } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const token = r.body.token;
  if (profile) await call('PUT', '/user/profile', { token, body: { profile } });
  return token;
};

// Smallest valid JPEG header bytes are enough for the magic-byte check
const jpeg = (size = 200) => {
  const buf = Buffer.alloc(size, 0x11);
  buf[0] = 0xff; buf[1] = 0xd8; buf[2] = 0xff;
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
};

before(async () => {
  await mongoose.connect(MONGO);
  await mongoose.connection.dropDatabase();
  server = spawn(process.execPath, [path.join(__dirname, '..', 'index.js')], {
    env: {
      ...process.env,
      MONGODB_URI: MONGO, JWT_SECRET: 'test-secret', PORT: String(PORT), NODE_ENV: 'test',
      FOOD_API: 'off', NOTIFY_DRY_RUN: '1', CRON_SECRET, VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '',
      SMTP_HOST: '', GOOGLE_CLIENT_ID: '', YOUTUBE_API_KEY: '',
    },
  });
  server.stdout.on('data', d => { serverLog += d; });
  server.stderr.on('data', d => { serverLog += d; });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${BASE}/health`)).ok) return; } catch { /* booting */ }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Server did not start:\n' + serverLog);
});

after(async () => {
  server?.kill();
  if (process.env.SHOW_SERVER_LOG) console.log(serverLog);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('weight log', () => {
  test('logging updates profile weight and recalculates calorie targets', async () => {
    const token = await newUser();
    const before = (await call('GET', '/user/profile', { token })).body;
    const r = await call('POST', '/weight', { token, body: { date: today, weight: 78.4, bodyFat: 18 } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.log.weight, 78.4);
    assert.equal(r.body.user.profile.weight, 78.4);
    assert.ok(r.body.user.dailyCalorieTarget < before.dailyCalorieTarget, 'lower weight → lower TDEE');
    assert.equal(r.body.user.password, undefined);
  });

  test('same day replaces the entry; history returns trend and summary', async () => {
    const token = await newUser();
    await call('POST', '/weight', { token, body: { date: daysAgo(2), weight: 81 } });
    await call('POST', '/weight', { token, body: { date: daysAgo(1), weight: 80 } });
    await call('POST', '/weight', { token, body: { date: today, weight: 79.9 } });
    await call('POST', '/weight', { token, body: { date: today, weight: 79 } }); // replace
    const r = await call('GET', `/weight/history?days=30&endDate=${today}`, { token });
    assert.equal(r.status, 200);
    assert.equal(r.body.entries.length, 3);
    assert.deepEqual(r.body.entries.map(e => e.weight), [81, 80, 79]);
    assert.equal(r.body.entries[2].trend, 80); // mean of 81, 80, 79
    assert.equal(r.body.summary.change, -2);
  });

  test('deleting the newest weigh-in falls back to the previous one', async () => {
    const token = await newUser();
    await call('POST', '/weight', { token, body: { date: daysAgo(1), weight: 82 } });
    await call('POST', '/weight', { token, body: { date: today, weight: 81 } });
    const r = await call('DELETE', `/weight/${today}`, { token });
    assert.equal(r.status, 200);
    assert.equal(r.body.user.profile.weight, 82);
    assert.equal((await call('DELETE', `/weight/${today}`, { token })).status, 404);
  });

  test('validation and isolation between users', async () => {
    const a = await newUser(); const b = await newUser();
    assert.equal((await call('POST', '/weight', { token: a, body: { date: today, weight: 5 } })).status, 400);
    assert.equal((await call('GET', '/weight/history?days=400', { token: a })).status, 400);
    await call('POST', '/weight', { token: a, body: { date: today, weight: 70 } });
    const r = await call('GET', '/weight/history', { token: b });
    assert.equal(r.body.entries.length, 0);
  });
});

describe('progress photos', () => {
  test('upload, list, fetch bytes, delete', async () => {
    const token = await newUser();
    await call('POST', '/weight', { token, body: { date: today, weight: 77.7 } });
    const up = await call('POST', '/photos', { token, body: { date: today, pose: 'side', image: jpeg(4000), thumb: jpeg(500), note: 'week 1' } });
    assert.equal(up.status, 201, JSON.stringify(up.body));
    assert.equal(up.body.weight, 77.7);
    assert.equal(up.body.image, undefined, 'list/meta never includes image bytes');

    const list = await call('GET', '/photos', { token });
    assert.equal(list.body.length, 1);

    const full = await call('GET', `/photos/${up.body._id}/image`, { token });
    assert.equal(full.status, 200);
    assert.equal(full.type, 'image/jpeg');
    assert.equal(full.body.length, 4000);
    const thumb = await call('GET', `/photos/${up.body._id}/image?size=thumb`, { token });
    assert.equal(thumb.body.length, 500);

    assert.equal((await call('DELETE', `/photos/${up.body._id}`, { token })).status, 200);
    assert.equal((await call('GET', '/photos', { token })).body.length, 0);
  });

  test('rejects non-images and other users', async () => {
    const a = await newUser(); const b = await newUser();
    const fake = `data:image/jpeg;base64,${Buffer.from('<script>alert(1)</script>').toString('base64')}`;
    assert.equal((await call('POST', '/photos', { token: a, body: { date: today, image: fake, thumb: fake } })).status, 400);
    const up = await call('POST', '/photos', { token: a, body: { date: today, image: jpeg(), thumb: jpeg() } });
    assert.equal((await call('GET', `/photos/${up.body._id}/image`, { token: b })).status, 404);
    assert.equal((await call('DELETE', `/photos/${up.body._id}`, { token: b })).status, 404);
  });

  test('accepts uploads above the default 100 kb JSON limit', async () => {
    const token = await newUser();
    const r = await call('POST', '/photos', { token, body: { date: today, image: jpeg(600 * 1024), thumb: jpeg(20 * 1024) } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
  });
});

describe('food database', () => {
  test('built-in Indian foods are searchable, per-100 g normalised', async () => {
    const token = await newUser();
    const r = await call('GET', '/foods/search?q=paneer', { token });
    assert.equal(r.status, 200);
    assert.ok(r.body.results.length >= 3);
    const raw = r.body.results.find(f => f.name === 'Paneer (raw)');
    assert.equal(raw.per100g.calories, 265);
    const roti = (await call('GET', '/foods/search?q=roti', { token })).body.results[0];
    assert.equal(roti.serving.grams, 40);
    assert.equal(roti.per100g.calories, 260); // 104 kcal per 40 g
  });

  test('barcode lookup validates input and reports when disabled', async () => {
    const token = await newUser();
    assert.equal((await call('GET', '/foods/barcode/abc', { token })).status, 400);
    assert.equal((await call('GET', '/foods/barcode/8901063093027', { token })).status, 503);
    assert.equal((await call('GET', '/foods/search?q=a', { token })).status, 400);
  });

  test('Open Food Facts products are normalised (unit test)', () => {
    const food = fromOpenFoodFacts({
      code: '8901063093027', product_name: 'Masala Noodles', brands: 'Maggi, Nestle',
      serving_size: '70 g', serving_quantity: '70', image_small_url: 'https://img/x.jpg',
      nutriments: { 'energy-kcal_100g': 427, proteins_100g: 8.1, carbohydrates_100g: 62.5, fat_100g: 15.7, fiber_100g: 2.3, sodium_100g: 1.01 },
    });
    assert.equal(food.id, 'off-8901063093027');
    assert.equal(food.brand, 'Maggi');
    assert.deepEqual(food.serving, { label: '70 g', grams: 70 });
    assert.equal(food.per100g.calories, 427);
    assert.equal(food.per100g.sodium, 1010);
    // kJ-only record converts; no energy at all is dropped
    assert.equal(fromOpenFoodFacts({ code: '1', nutriments: { energy_100g: 418.4 } }).per100g.calories, 100);
    assert.equal(fromOpenFoodFacts({ code: '2', nutriments: {} }), null);
  });
});

describe('smart reminders', () => {
  test('clock and slot helpers (unit test)', () => {
    assert.deepEqual(localClock(new Date('2026-11-09T05:30:00Z'), 'Asia/Kolkata'), { date: '2026-11-09', minutes: 660 });
    assert.deepEqual(slotsFor('water', { from: '09:00', to: '13:00', everyHours: 2 }), [540, 660, 780]);
    assert.equal(dueSlot([540, 660, 780], 700), 660);
    assert.equal(dueSlot([540, 660, 780], 720), null); // 60 min late is outside the window
  });

  test('settings round-trip with validation', async () => {
    const token = await newUser();
    const r = await call('PUT', '/reminders/settings', { token, body: { enabled: true, workout: { time: '07:15' }, timezone: 'Europe/London' } });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.reminders.workout.time, '07:15');
    assert.equal(r.body.timezone, 'Europe/London');
    assert.equal((await call('PUT', '/reminders/settings', { token, body: { workout: { time: '25:00' } } })).status, 400);
    assert.equal((await call('PUT', '/reminders/settings', { token, body: { timezone: 'Mars/Base' } })).status, 400);
    assert.equal((await call('PUT', '/reminders/settings', { token, body: { water: { from: '20:00', to: '09:00' } } })).status, 400);
  });

  test('devices register (web + expo) and validate', async () => {
    const token = await newUser();
    const web = await call('POST', '/reminders/devices', { token, body: { type: 'web', subscription: { endpoint: 'https://push.example.com/abc', keys: { p256dh: 'k', auth: 'a' } } } });
    assert.equal(web.status, 201, JSON.stringify(web.body));
    const expo = await call('POST', '/reminders/devices', { token, body: { type: 'expo', token: 'ExponentPushToken[abc123]' } });
    assert.equal(expo.body.devices, 2);
    assert.equal((await call('POST', '/reminders/devices', { token, body: { type: 'expo', token: 'nope' } })).status, 400);
    const del = await call('DELETE', '/reminders/devices', { token, body: { endpoint: 'ExponentPushToken[abc123]' } });
    assert.equal(del.body.devices, 1);
    assert.equal((await call('POST', '/reminders/test', { token })).status, 200);
  });

  test('cron run sends only useful reminders, once per slot', async () => {
    const token = await newUser();
    const me = (await call('GET', '/user/profile', { token })).body;
    await call('PUT', '/reminders/settings', {
      token,
      body: {
        enabled: true, timezone: 'Asia/Kolkata',
        water: { on: true, from: '09:00', to: '21:00', everyHours: 2 },
        workout: { on: true, time: '11:00' }, meals: { on: false }, sleep: { on: false }, weighIn: { on: true, time: '11:00' },
      },
    });
    const date = localClock(new Date(), 'Asia/Kolkata').date;
    const at11 = new Date(`${date}T05:40:00Z`); // 11:10 IST
    // Weigh-in done today → that reminder is skipped
    await call('POST', '/weight', { token, body: { date, weight: 80 } });

    const run = (now) => call('POST', '/reminders/run', { headers: { 'X-Cron-Secret': CRON_SECRET }, body: { now } });
    assert.equal((await call('POST', '/reminders/run', { headers: { 'X-Cron-Secret': 'wrong' } })).status, 401);

    const first = await run(at11.toISOString());
    assert.equal(first.status, 200, JSON.stringify(first.body));
    const mine = first.body.sent.filter(s => s.user === me._id).map(s => s.kind).sort();
    assert.deepEqual(mine, ['water', 'workout']); // no water logged, no workout logged

    const again = await run(new Date(at11.getTime() + 10 * 60e3).toISOString());
    assert.equal(again.body.sent.filter(s => s.user === me._id).length, 0, 'same slot is not sent twice');

    // On pace for water at 13:00 → skipped; log a workout too
    await call('POST', `/water/${date}/add`, { token, body: { amount: 1500 } });
    const at13 = new Date(`${date}T07:35:00Z`); // 13:05 IST
    const later = await run(at13.toISOString());
    assert.equal(later.body.sent.filter(s => s.user === me._id).length, 0);
  });
});

describe('health sync', () => {
  test('merges steps (max), fills sleep/weight gaps, dedupes workouts', async () => {
    const token = await newUser();
    const d1 = daysAgo(1);
    await call('POST', '/steps', { token, body: { date: d1, steps: 12000 } });            // manual, higher
    await call('POST', '/sleep', { token, body: { date: d1, duration: 7, quality: 4 } }); // manual

    const payload = {
      source: 'health_connect',
      days: [
        { date: d1, steps: 9000, sleep: { durationHours: 6.5 }, weightKg: 79.2 },
        {
          date: today, steps: 4321, distanceKm: 3.1, activeCalories: 180,
          sleep: { durationHours: 7.25, bedtime: `${d1}T23:00:00Z`, wakeTime: `${today}T06:15:00Z` },
          workouts: [{ id: 'hc-run-1', type: 'running', start: `${today}T07:00:00Z`, end: `${today}T07:30:00Z`, calories: 300, distanceKm: 5 }],
        },
      ],
    };
    const r = await call('POST', '/health-sync', { token, body: payload });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual(r.body.summary, { steps: 1, sleep: 1, weight: 1, workouts: 1, skipped: 2 });

    assert.equal((await call('GET', `/steps/${d1}`, { token })).body.steps, 12000);
    assert.equal((await call('GET', `/sleep/${d1}`, { token })).body.duration, 7);
    const steps = (await call('GET', `/steps/${today}`, { token })).body;
    assert.equal(steps.steps, 4321);
    assert.equal(steps.source, 'health_connect');
    const workout = (await call('GET', `/training/logs/${today}`, { token })).body;
    assert.equal(workout.synced.length, 1);
    assert.equal(workout.synced[0].durationMin, 30);
    assert.equal(workout.totalCaloriesBurnt, 300);

    // Re-sync is idempotent for workouts
    const again = await call('POST', '/health-sync', { token, body: payload });
    assert.equal(again.body.summary.workouts, 0);
    const status = await call('GET', '/health-sync/status', { token });
    assert.equal(status.body.source, 'health_connect');
  });

  test('validation', async () => {
    const token = await newUser();
    assert.equal((await call('POST', '/health-sync', { token, body: { source: 'fitbit', days: [{ date: today }] } })).status, 400);
    assert.equal((await call('POST', '/health-sync', { token, body: { source: 'apple_health', days: [] } })).status, 400);
    assert.equal((await call('POST', '/health-sync', { token, body: { source: 'apple_health', days: [{ date: 'x' }] } })).status, 400);
  });
});
