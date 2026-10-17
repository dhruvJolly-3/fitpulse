// Tests for weight log, food database, photos, reminders and Fitbit sync.
// External services (Open Food Facts, Fitbit) are replaced by a local fake
// server, so these run offline. Same setup as api.test.js:
//   cd server && TEST_MONGODB_URI=mongodb://127.0.0.1:27017/fitpulse_test npm test
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const mongoose = require('mongoose');
const webpush = require('web-push');

const MONGO = (process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/fitpulse_test') + '_features';
const PORT = 5098, FAKE_PORT = 5097;
const BASE = `http://127.0.0.1:${PORT}/api`;
const FAKE = `http://127.0.0.1:${FAKE_PORT}`;
let server, fake, serverLog = '';

const day = (n = 0) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
const today = day(0);

const call = async (method, url, { token, body, raw } = {}) => {
  const res = await fetch(BASE + url, {
    method, redirect: 'manual',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: data, headers: res.headers };
};
const register = async (email) => {
  const r = await call('POST', '/auth/register', { body: { name: 'Feature Tester', email, password: 'secret123' } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.token;
};

// ---- Fake Open Food Facts + Fitbit ----
const offProduct = {
  code: '8901058000290', product_name: 'Masala Oats', brands: 'Saffola, Marico', image_small_url: 'https://img/x.jpg',
  serving_size: '40 g', serving_quantity: 40,
  nutriments: { 'energy-kcal_100g': 375, proteins_100g: 10.2, carbohydrates_100g: 63, fat_100g: 8.4, fiber_100g: 9, sugars_100g: 2.1, sodium_100g: 0.62 },
};
const fitbitCalls = [];
const fakeHandler = (req, res) => {
  const url = new URL(req.url, FAKE);
  const json = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
  fitbitCalls.push(url.pathname);
  if (url.pathname === '/cgi/search.pl') {
    return json(200, { products: [offProduct, { code: '1', product_name: 'No calories here', nutriments: {} }] });
  }
  if (url.pathname.startsWith('/api/v2/product/')) {
    return url.pathname.includes(offProduct.code) ? json(200, { status: 1, product: offProduct }) : json(404, { status: 0 });
  }
  if (url.pathname === '/oauth2/token') {
    let body = '';
    req.on('data', c => { body += c; });
    return req.on('end', () => {
      const p = new URLSearchParams(body);
      if (req.headers.authorization !== 'Basic ' + Buffer.from('fb-id:fb-secret').toString('base64')) return json(401, {});
      if (p.get('grant_type') === 'authorization_code' && p.get('code') === 'good-code') {
        return json(200, { access_token: 'acc-1', refresh_token: 'ref-1', expires_in: 28800, user_id: 'FB123' });
      }
      return json(400, { errors: [{ errorType: 'invalid_grant' }] });
    });
  }
  if (req.headers.authorization !== 'Bearer acc-1') return json(401, {});
  if (url.pathname.includes('/activities/steps/')) return json(200, { 'activities-steps': [{ dateTime: day(1), value: '9100' }, { dateTime: today, value: '4200' }] });
  if (url.pathname.includes('/activities/distance/')) return json(200, { 'activities-distance': [{ dateTime: day(1), value: '6.9' }] });
  if (url.pathname.includes('/activities/activityCalories/')) return json(200, { 'activities-activityCalories': [{ dateTime: day(1), value: '410' }] });
  if (url.pathname.includes('/sleep/')) {
    return json(200, { sleep: [{ dateOfSleep: today, isMainSleep: true, minutesAsleep: 441, startTime: `${day(1)}T23:10:00.000`, endTime: `${today}T07:05:00.000`, levels: { summary: { deep: { minutes: 80 }, rem: { minutes: 95 }, wake: { minutes: 34 } } } }] });
  }
  if (url.pathname.endsWith('/activities/list.json')) {
    return json(200, { activities: [{ logId: 777, activityName: 'Run', startTime: `${day(1)}T07:15:30.000+05:30`, activeDuration: 1800000, calories: 310, distance: 5.1, averageHeartRate: 151 }] });
  }
  if (url.pathname.includes('/body/log/weight/')) return json(200, { weight: [{ date: day(2), weight: 84.6 }] });
  if (url.pathname === '/oauth2/revoke') return json(200, {});
  json(404, {});
};

before(async () => {
  fake = http.createServer(fakeHandler).listen(FAKE_PORT);
  await mongoose.connect(MONGO);
  await mongoose.connection.dropDatabase();
  const vapid = webpush.generateVAPIDKeys();
  server = spawn(process.execPath, [path.join(__dirname, '..', 'index.js')], {
    env: {
      ...process.env, MONGODB_URI: MONGO, JWT_SECRET: 'test-secret', PORT: String(PORT), NODE_ENV: 'test',
      APP_URL: 'http://app.test', CORS_ORIGINS: '', SMTP_HOST: '', GOOGLE_CLIENT_ID: '', YOUTUBE_API_KEY: '',
      OFF_BASE_URL: FAKE, FITBIT_API_BASE: FAKE, FITBIT_AUTH_URL: `${FAKE}/oauth2/authorize`,
      FITBIT_CLIENT_ID: 'fb-id', FITBIT_CLIENT_SECRET: 'fb-secret', FITBIT_REDIRECT_URI: `${BASE}/integrations/fitbit/callback`,
      VAPID_PUBLIC_KEY: vapid.publicKey, VAPID_PRIVATE_KEY: vapid.privateKey, VAPID_SUBJECT: 'mailto:test@example.com',
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
  fake?.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('weight log', () => {
  test('log, list, update targets from the newest weigh-in, delete', async () => {
    const token = await register('weight@test.dev');
    await call('PUT', '/user/profile', { token, body: { profile: { age: 28, gender: 'male', height: 178, weight: 90, goal: 'lose_weight' } } });
    const before = (await call('GET', '/user/profile', { token })).body.dailyCalorieTarget;

    assert.equal((await call('POST', '/weight', { token, body: { date: day(3), weight: 89.4 } })).status, 201);
    const r = await call('POST', '/weight', { token, body: { date: today, weight: 86.04 } });
    assert.equal(r.status, 201);
    assert.equal(r.body.log.weight, 86); // rounded to 0.1 kg
    assert.ok(r.body.dailyCalorieTarget < before, 'lighter body → lower calorie target');

    // Same day again replaces it
    await call('POST', '/weight', { token, body: { date: today, weight: 85.5 } });
    const list = await call('GET', '/weight?days=30', { token });
    assert.deepEqual(list.body.map(l => l.weight), [89.4, 85.5]);
    assert.equal((await call('GET', '/user/profile', { token })).body.profile.weight, 85.5);

    assert.equal((await call('DELETE', `/weight/${today}`, { token })).status, 200);
    assert.equal((await call('GET', '/user/profile', { token })).body.profile.weight, 89.4, 'falls back to the previous weigh-in');
    assert.equal((await call('DELETE', `/weight/${today}`, { token })).status, 404);
  });

  test('validation and isolation', async () => {
    const a = await register('weight-a@test.dev'), b = await register('weight-b@test.dev');
    assert.equal((await call('POST', '/weight', { token: a, body: { date: today, weight: 5 } })).status, 400);
    assert.equal((await call('POST', '/weight', { token: a, body: { date: 'yesterday', weight: 70 } })).status, 400);
    await call('POST', '/weight', { token: a, body: { date: today, weight: 70 } });
    assert.equal((await call('GET', '/weight', { token: b })).body.length, 0);
    assert.equal((await call('GET', '/weight')).status, 401);
  });
});

describe('food database', () => {
  test('search returns normalised, loggable foods', async () => {
    const token = await register('food@test.dev');
    const r = await call('GET', '/foods/search?q=oats', { token });
    assert.equal(r.status, 200);
    assert.equal(r.body.length, 1, 'products without calories are dropped');
    assert.deepEqual(r.body[0], {
      code: '8901058000290', name: 'Masala Oats', brand: 'Saffola', image: 'https://img/x.jpg',
      per100g: { calories: 375, protein: 10.2, carbs: 63, fat: 8.4, fiber: 9, sugar: 2.1, sodium: 620 },
      serving: { label: '40 g', grams: 40 },
    });
    assert.equal((await call('GET', '/foods/search?q=a', { token })).status, 400);
  });

  test('barcode lookup, unknown barcode, bad barcode', async () => {
    const token = await register('barcode@test.dev');
    const ok = await call('GET', '/foods/barcode/8901058000290', { token });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.name, 'Masala Oats');
    assert.equal((await call('GET', '/foods/barcode/0000000000000', { token })).status, 404);
    assert.equal((await call('GET', '/foods/barcode/abc', { token })).status, 400);
  });
});

describe('photos', () => {
  const img = 'data:image/jpeg;base64,' + Buffer.alloc(3000, 7).toString('base64');
  const thumb = 'data:image/jpeg;base64,' + Buffer.alloc(300, 7).toString('base64');

  test('upload, list thumbs only, fetch full image, delete', async () => {
    const token = await register('photos@test.dev');
    const up = await call('POST', '/photos', { token, body: { kind: 'progress', date: today, image: img, thumb, weight: 82.5, pose: 'front' } });
    assert.equal(up.status, 201, JSON.stringify(up.body));
    assert.equal(up.body.image, undefined);
    await call('POST', '/photos', { token, body: { kind: 'meal', date: today, image: img, thumb, mealType: 'lunch' } });

    const list = await call('GET', '/photos?kind=progress', { token });
    assert.equal(list.body.length, 1);
    assert.equal(list.body[0].image, undefined, 'lists never carry the full image');
    assert.equal(list.body[0].pose, 'front');
    const meals = await call('GET', `/photos?kind=meal&date=${today}`, { token });
    assert.equal(meals.body[0].mealType, 'lunch');

    const full = await call('GET', `/photos/${up.body._id}`, { token });
    assert.equal(full.body.image, img);
    assert.equal((await call('DELETE', `/photos/${up.body._id}`, { token })).status, 200);
    assert.equal((await call('GET', `/photos/${up.body._id}`, { token })).status, 404);
  });

  test('rejects non-images, oversized uploads and other users', async () => {
    const a = await register('photos-a@test.dev'), b = await register('photos-b@test.dev');
    assert.equal((await call('POST', '/photos', { token: a, body: { kind: 'progress', date: today, image: 'data:text/html;base64,PGI+', thumb } })).status, 400);
    const huge = 'data:image/jpeg;base64,' + 'A'.repeat(1_600_000);
    assert.equal((await call('POST', '/photos', { token: a, body: { kind: 'progress', date: today, image: huge, thumb } })).status, 400);
    const tooBig = 'data:image/jpeg;base64,' + 'A'.repeat(2_200_000);
    assert.equal((await call('POST', '/photos', { token: a, body: { kind: 'progress', date: today, image: tooBig, thumb } })).status, 413);
    const mine = await call('POST', '/photos', { token: a, body: { kind: 'progress', date: today, image: img, thumb } });
    assert.equal((await call('GET', `/photos/${mine.body._id}`, { token: b })).status, 404);
    assert.equal((await call('DELETE', `/photos/${mine.body._id}`, { token: b })).status, 404);
  });
});

describe('smart reminders', () => {
  test('settings round-trip and validation', async () => {
    const token = await register('remind@test.dev');
    const s = await call('GET', '/reminders/settings', { token });
    assert.equal(s.body.reminders.enabled, false);
    assert.equal(s.body.push.configured, true);
    assert.ok(s.body.push.publicKey);

    const put = await call('PUT', '/reminders/settings', { token, body: { timezone: 'Asia/Kolkata', reminders: { enabled: true, water: { everyHours: 3 }, bedtime: { time: '23:15' } } } });
    assert.equal(put.status, 200, JSON.stringify(put.body));
    assert.equal(put.body.reminders.water.everyHours, 3);
    assert.equal(put.body.reminders.bedtime.time, '23:15');
    assert.equal((await call('PUT', '/reminders/settings', { token, body: { reminders: { bedtime: { time: '25:00' } } } })).status, 400);
    assert.equal((await call('PUT', '/reminders/settings', { token, body: { timezone: 'Mars/Base' } })).status, 400);
    assert.equal((await call('PUT', '/reminders/settings', { token, body: { reminders: { water: { from: '22:00', to: '08:00' } } } })).status, 400);
  });

  test('plan skips reminders whose goal is already met', async () => {
    const token = await register('plan@test.dev');
    await call('PUT', '/reminders/settings', { token, body: { timezone: 'UTC', reminders: { enabled: true } } });
    const before = (await call('GET', '/reminders/plan', { token })).body;
    assert.ok(before.length > 0);
    for (const p of before) { assert.ok(new Date(p.at) > new Date()); assert.ok(p.title && p.body && p.url); }

    // Hit today's water goal, log every meal, a workout and a weigh-in → only bedtime is left today
    await call('POST', `/water/${today}/add`, { token, body: { amount: 3000 } });
    for (const mealType of ['breakfast', 'lunch', 'dinner']) await call('POST', `/nutrition/${today}/food`, { token, body: { name: 'x', mealType, calories: 100 } });
    await call('POST', '/training/logs', { token, body: { date: today, dayLabel: 'Push', exercises: [] } });
    await call('POST', '/weight', { token, body: { date: today, weight: 80 } });
    const after = (await call('GET', '/reminders/plan', { token })).body;
    const todays = after.filter(p => p.id.startsWith(today)).map(p => p.id.split(':')[1]);
    assert.ok(todays.every(k => k === 'bedtime'), `only bedtime left today, got ${todays}`);
    assert.ok(after.some(p => !p.id.startsWith(today) && p.id.endsWith('water-0')), 'tomorrow is fully planned');
  });

  test('web push subscribe / unsubscribe', async () => {
    const token = await register('push@test.dev');
    const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc123', keys: { p256dh: 'B'.repeat(87), auth: 'A'.repeat(22) } };
    assert.equal((await call('POST', '/reminders/subscribe', { token, body: sub })).status, 201);
    assert.equal((await call('POST', '/reminders/subscribe', { token, body: { endpoint: 'http://insecure', keys: sub.keys } })).status, 400);
    assert.equal((await call('DELETE', '/reminders/subscribe', { token, body: { endpoint: sub.endpoint } })).status, 200);
  });
});

describe('fitbit sync', () => {
  test('connect → callback → sync merges steps, sleep, workouts and weight', async () => {
    const token = await register('fitbit@test.dev');
    await call('PUT', '/user/profile', { token, body: { profile: { age: 30, gender: 'male', height: 180, weight: 88 } } });
    assert.deepEqual((await call('GET', '/integrations/fitbit/status', { token })).body, { configured: true, connected: false, lastSyncAt: null });

    // A step count typed by hand that is higher than Fitbit's must survive
    await call('POST', '/steps', { token, body: { date: today, steps: 6000 } });

    const { body: { url } } = await call('POST', '/integrations/fitbit/connect', { token });
    const state = new URL(url).searchParams.get('state');
    assert.ok(url.startsWith(`${FAKE}/oauth2/authorize?`));

    const forged = await call('GET', `/integrations/fitbit/callback?code=good-code&state=forged`);
    assert.equal(forged.status, 302);
    assert.equal(forged.headers.get('location'), 'http://app.test/profile?fitbit=error');

    const cb = await call('GET', `/integrations/fitbit/callback?code=good-code&state=${encodeURIComponent(state)}`);
    assert.equal(cb.status, 302);
    assert.equal(cb.headers.get('location'), 'http://app.test/profile?fitbit=connected');

    const status = (await call('GET', '/integrations/fitbit/status', { token })).body;
    assert.equal(status.connected, true);
    assert.ok(status.lastSyncAt, 'first sync runs right after connecting');
    const profile = (await call('GET', '/user/profile', { token })).body;
    assert.equal(profile.fitbit.accessToken, undefined, 'tokens never leave the server');

    const y = await call('GET', `/steps/${day(1)}`, { token });
    assert.equal(y.body.steps, 9100);
    assert.equal(y.body.distance, 6.9);
    assert.equal((await call('GET', `/steps/${today}`, { token })).body.steps, 6000, 'manual higher value kept');
    const sleep = (await call('GET', `/sleep/${today}`, { token })).body;
    assert.equal(sleep.duration, 7.4);
    assert.equal(sleep.deepSleep, 1.3);
    const w = (await call('GET', '/weight?days=7', { token })).body;
    assert.equal(w[0].weight, 84.6);
    assert.equal((await call('GET', '/user/profile', { token })).body.profile.weight, 84.6);

    // Syncing again doesn't duplicate the workout
    const again = await call('POST', '/integrations/fitbit/sync', { token });
    assert.equal(again.status, 200, JSON.stringify(again.body));
    const logs = (await call('GET', '/training/logs', { token })).body;
    const run = logs.find(l => l.date === day(1));
    assert.equal(run.exercises.filter(e => e.name === 'Run').length, 1);
    assert.equal(run.exercises[0].duration, 30);

    assert.equal((await call('DELETE', '/integrations/fitbit', { token })).status, 200);
    assert.equal((await call('GET', '/integrations/fitbit/status', { token })).body.connected, false);
    assert.equal((await call('POST', '/integrations/fitbit/sync', { token })).status, 409);
  });
});
