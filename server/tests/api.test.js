// End-to-end API tests: start the real server against a throwaway MongoDB
// database and exercise every route over HTTP.
//
// Run:  cd server && TEST_MONGODB_URI=mongodb://127.0.0.1:27017/fitpulse_test npm test
// Needs a running MongoDB (e.g. `docker run -d -p 27017:27017 mongo:7`).
// The test database is dropped before and after the run.
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');

const MONGO = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/fitpulse_test';
const PORT = 5099;
const BASE = `http://127.0.0.1:${PORT}/api`;
const ORIGIN = 'https://fitpulse-ruddy.vercel.app';
let server, serverLog = '';

const today = new Date().toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };

// Small fetch helper: returns { status, body }
const call = async (method, url, { token, body, headers = {} } = {}) => {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, body: data };
};

const register = async (email, password = 'secret123', name = 'Test User') => {
  const r = await call('POST', '/auth/register', { body: { name, email, password } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.token;
};

before(async () => {
  await mongoose.connect(MONGO);
  await mongoose.connection.dropDatabase();
  server = spawn(process.execPath, [path.join(__dirname, '..', 'index.js')], {
    env: {
      ...process.env,
      MONGODB_URI: MONGO, JWT_SECRET: 'test-secret', PORT: String(PORT),
      CORS_ORIGINS: ORIGIN, APP_URL: 'http://app.test', NODE_ENV: 'test',
      SMTP_HOST: '', GOOGLE_CLIENT_ID: '', YOUTUBE_API_KEY: '',
    },
  });
  server.stdout.on('data', d => { serverLog += d; });
  server.stderr.on('data', d => { serverLog += d; });
  for (let i = 0; i < 50; i++) {             // wait up to ~10s for boot
    try { if ((await fetch(`${BASE}/health`)).ok) return; } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Server did not start:\n' + serverLog);
});

after(async () => {
  server?.kill();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('health & plumbing', () => {
  test('health reports DB connected', async () => {
    const r = await call('GET', '/health');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { status: 'ok', db: 'connected' });
  });
  test('unknown route → 404 JSON', async () => {
    const r = await call('GET', '/does-not-exist');
    assert.equal(r.status, 404);
    assert.ok(r.body.message);
  });
  test('CORS: allowed origin passes, unknown origin is refused', async () => {
    const ok = await call('GET', '/health', { headers: { Origin: ORIGIN } });
    assert.equal(ok.status, 200);
    const bad = await call('GET', '/health', { headers: { Origin: 'https://evil.example' } });
    assert.equal(bad.status, 403);
  });
  test('protected routes need a token', async () => {
    assert.equal((await call('GET', '/user/profile')).status, 401);
    assert.equal((await call('GET', '/user/profile', { token: 'garbage' })).status, 401);
  });
});

describe('auth', () => {
  test('register → login → profile', async () => {
    const token = await register('alice@test.dev');
    const login = await call('POST', '/auth/login', { body: { email: 'alice@test.dev', password: 'secret123' } });
    assert.equal(login.status, 200);
    assert.ok(login.body.token);
    const me = await call('GET', '/user/profile', { token });
    assert.equal(me.status, 200);
    assert.equal(me.body.email, 'alice@test.dev');
    assert.equal(me.body.password, undefined, 'password hash must never be returned');
    assert.equal(me.body.resetPasswordTokenHash, undefined);
  });
  test('duplicate email is rejected', async () => {
    const r = await call('POST', '/auth/register', { body: { name: 'A', email: 'alice@test.dev', password: 'secret123' } });
    assert.equal(r.status, 400);
  });
  test('wrong password → 401 with a generic message', async () => {
    const r = await call('POST', '/auth/login', { body: { email: 'alice@test.dev', password: 'nope-nope' } });
    assert.equal(r.status, 401);
    assert.equal(r.body.message, 'Invalid credentials');
  });
  test('validation errors are 400 with field list', async () => {
    const r = await call('POST', '/auth/register', { body: { name: '', email: 'not-an-email', password: '1' } });
    assert.equal(r.status, 400);
    assert.ok(Array.isArray(r.body.errors) && r.body.errors.length >= 2);
  });
  test('Google sign-in is off without GOOGLE_CLIENT_ID', async () => {
    const r = await call('POST', '/auth/google', { body: { credential: 'x' } });
    assert.equal(r.status, 503);
  });
});

describe('forgot / reset password', () => {
  test('same reply for known and unknown emails (no account enumeration)', async () => {
    const a = await call('POST', '/auth/forgot-password', { body: { email: 'alice@test.dev' } });
    const b = await call('POST', '/auth/forgot-password', { body: { email: 'nobody@test.dev' } });
    assert.equal(a.status, 200);
    assert.deepEqual(a.body, b.body);
  });
  test('reset link works once, then the old password stops working', async () => {
    serverLog = '';
    await call('POST', '/auth/forgot-password', { body: { email: 'alice@test.dev' } });
    await new Promise(r => setTimeout(r, 300));
    const token = (serverLog.match(/reset-password\?token=([a-f0-9]{64})/) || [])[1];
    assert.ok(token, 'reset link should be logged when SMTP is not configured');
    const reset = await call('POST', '/auth/reset-password', { body: { token, password: 'newpass456' } });
    assert.equal(reset.status, 200);
    assert.ok(reset.body.token);
    const again = await call('POST', '/auth/reset-password', { body: { token, password: 'another789' } });
    assert.equal(again.status, 400, 'token must be single-use');
    assert.equal((await call('POST', '/auth/login', { body: { email: 'alice@test.dev', password: 'secret123' } })).status, 401);
    assert.equal((await call('POST', '/auth/login', { body: { email: 'alice@test.dev', password: 'newpass456' } })).status, 200);
  });
  test('garbage reset token is rejected', async () => {
    const r = await call('POST', '/auth/reset-password', { body: { token: 'a'.repeat(64), password: 'whatever1' } });
    assert.equal(r.status, 400);
  });
});

describe('profile & targets', () => {
  let token;
  before(async () => { token = await register('bob@test.dev'); });

  test('profile update calculates TDEE and macros', async () => {
    const r = await call('PUT', '/user/profile', { token, body: {
      profile: { age: 25, gender: 'male', height: 177, weight: 88, activityLevel: 'moderately_active', goal: 'lose_weight', dietType: 'veg' },
    } });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    // Mifflin-St Jeor: 10*88 + 6.25*177 - 5*25 + 5 = 1866.25 → ×1.55 ≈ 2893
    assert.ok(Math.abs(r.body.tdee - 2893) <= 2, `tdee was ${r.body.tdee}`);
    assert.ok(r.body.dailyCalorieTarget < r.body.tdee, 'lose_weight target should be below TDEE');
    assert.ok(r.body.macroTargets.protein > 0);
  });
  test('out-of-range values are rejected', async () => {
    const r = await call('PUT', '/user/profile', { token, body: { profile: { age: 5 } } });
    assert.equal(r.status, 400);
  });
  test('cannot overwrite protected fields like email or password', async () => {
    await call('PUT', '/user/profile', { token, body: { email: 'hacker@test.dev', password: 'x' } });
    const me = await call('GET', '/user/profile', { token });
    assert.equal(me.body.email, 'bob@test.dev');
  });
});

describe('daily logs', () => {
  let token, other;
  before(async () => { token = await register('carol@test.dev'); other = await register('dave@test.dev'); });

  test('nutrition: add, total, delete', async () => {
    const a = await call('POST', `/nutrition/${today}/food`, { token, body: { name: 'Poha', mealType: 'breakfast', calories: 300, protein: 8, carbs: 50, fat: 8 } });
    assert.equal(a.status, 200, JSON.stringify(a.body));
    const b = await call('POST', `/nutrition/${today}/food`, { token, body: { name: 'Dal', mealType: 'lunch', calories: 250, protein: 14 } });
    assert.equal(b.body.totals.calories, 550);
    assert.equal(b.body.totals.protein, 22);
    const id = b.body.foods[0]._id;
    const d = await call('DELETE', `/nutrition/${today}/food/${id}`, { token });
    assert.equal(d.status, 200);
    assert.equal(d.body.totals.calories, 250);
  });
  test('nutrition: bad meal type and negative calories are rejected', async () => {
    assert.equal((await call('POST', `/nutrition/${today}/food`, { token, body: { name: 'X', mealType: 'brunch', calories: 1 } })).status, 400);
    assert.equal((await call('POST', `/nutrition/${today}/food`, { token, body: { name: 'X', mealType: 'lunch', calories: -5 } })).status, 400);
  });
  test('bad date format → 400', async () => {
    assert.equal((await call('GET', '/nutrition/26-09-2026', { token })).status, 400);
  });
  test('water: add entries, total, delete', async () => {
    await call('POST', `/water/${today}/add`, { token, body: { amount: 500, type: 'water' } });
    const r = await call('POST', `/water/${today}/add`, { token, body: { amount: 250, type: 'coffee' } });
    assert.equal(r.body.total, 750);
    const del = await call('DELETE', `/water/${today}/entry/${r.body.entries[0]._id}`, { token });
    assert.equal(del.body.total, 250);
  });
  test('sleep: upsert for a date', async () => {
    const a = await call('POST', '/sleep', { token, body: { date: today, duration: 6.5, quality: 3 } });
    assert.ok([200, 201].includes(a.status));
    const b = await call('POST', '/sleep', { token, body: { date: today, duration: 7.5, quality: 4 } });
    assert.equal(b.body.duration, 7.5);
    const g = await call('GET', `/sleep/${today}`, { token });
    assert.equal(g.body.duration, 7.5);
  });
  test('steps: upsert and bounds', async () => {
    const a = await call('POST', '/steps', { token, body: { date: today, steps: 8000 } });
    assert.ok([200, 201].includes(a.status));
    assert.equal((await call('POST', '/steps', { token, body: { date: today, steps: -1 } })).status, 400);
  });
  test('data is private: another user sees none of it', async () => {
    const n = await call('GET', `/nutrition/${today}`, { token: other });
    assert.equal(n.body.foods.length, 0);
    const w = await call('GET', `/water/${today}`, { token: other });
    assert.equal(w.body.total, 0);
    const s = await call('GET', `/steps/${today}`, { token: other });
    assert.equal(s.body.steps, 0);
  });
  test('cannot write into another user by sending "user" in the body', async () => {
    const me = await call('GET', '/user/profile', { token: other });
    await call('POST', '/steps', { token, body: { date: daysAgo(1), steps: 1234, user: me.body._id } });
    const s = await call('GET', `/steps/${daysAgo(1)}`, { token: other });
    assert.equal(s.body.steps, 0);
  });
});

describe('history (7 / 30 days)', () => {
  let token;
  before(async () => {
    token = await register('erin@test.dev');
    for (let i = 0; i < 35; i++) await call('POST', '/steps', { token, body: { date: daysAgo(i), steps: 1000 + i } });
  });
  test('default returns 7 days', async () => {
    const r = await call('GET', `/steps/history/week?startDate=${daysAgo(6)}`, { token });
    assert.equal(r.status, 200);
    assert.equal(r.body.length, 7);
  });
  test('days=30 returns 30 days, oldest first', async () => {
    const r = await call('GET', `/steps/history/week?startDate=${daysAgo(29)}&days=30`, { token });
    assert.equal(r.body.length, 30);
    assert.equal(r.body[0].date, daysAgo(29));
    assert.equal(r.body[29].date, today);
  });
  test('days outside 1–31 is rejected', async () => {
    assert.equal((await call('GET', `/steps/history/week?startDate=${daysAgo(6)}&days=90`, { token })).status, 400);
    assert.equal((await call('GET', `/steps/history/week?startDate=${daysAgo(6)}&days=0`, { token })).status, 400);
  });
  test('missing startDate is rejected', async () => {
    assert.equal((await call('GET', '/water/history/week', { token })).status, 400);
  });
});

describe('training', () => {
  let token;
  before(async () => { token = await register('frank@test.dev'); });
  test('create program, then read it back', async () => {
    const p = await call('POST', '/training/programs', { token, body: {
      name: 'Test Split', goal: 'gain_muscle', daysPerWeek: 4, durationWeeks: 8,
      schedule: [{ day: 1, label: 'Push', isRest: false, exercises: [{ name: 'Bench Press', category: 'push', sets: 4, reps: '8' }] }],
    } });
    assert.ok([200, 201].includes(p.status), JSON.stringify(p.body));
    const list = await call('GET', '/training/programs', { token });
    assert.equal(list.body.length, 1);
  });
  test('logs + streak across consecutive days', async () => {
    for (let i = 0; i < 3; i++) {
      const r = await call('POST', '/training/logs', { token, body: { date: daysAgo(i), dayLabel: 'Push', exercises: [{ name: 'Bench Press', category: 'push', completed: true }] } });
      assert.ok([200, 201].includes(r.status), JSON.stringify(r.body));
    }
    const s = await call('GET', '/training/streak', { token });
    assert.equal(s.body.streak, 3);
    assert.equal(s.body.totalWorkouts, 3);
  });
  test('an off day breaks the streak', async () => {
    await call('POST', '/training/logs', { token, body: { date: daysAgo(1), isOffDay: true } });
    const s = await call('GET', '/training/streak', { token });
    assert.equal(s.body.streak, 1);
  });
  test('range query returns logs in the window', async () => {
    const r = await call('GET', `/training/logs?startDate=${daysAgo(29)}&endDate=${today}&limit=31`, { token });
    assert.equal(r.status, 200);
    assert.equal(r.body.length, 3);
  });
});

describe('third-party proxies', () => {
  let token;
  before(async () => { token = await register('gina@test.dev'); });
  test('videos: 503 when YOUTUBE_API_KEY is not set', async () => {
    assert.equal((await call('GET', '/videos/search?q=squat', { token })).status, 503);
    assert.equal((await call('GET', '/videos/music?q=gym', { token })).status, 503);
  });
  test('videos: query is validated', async () => {
    assert.equal((await call('GET', '/videos/search?q=a', { token })).status, 400);
  });
  test('recipes: needs q, area or category', async () => {
    assert.equal((await call('GET', '/recipes/search', { token })).status, 400);
  });
  test('recipes: rejects odd cuisine values', async () => {
    assert.equal((await call('GET', '/recipes/search?area=<script>', { token })).status, 400);
  });
});

describe('rate limiting (brute-force protection)', () => {
  test('11th wrong password for the same account in 15 min → 429', async () => {
    await register('victim@test.dev');
    const codes = [];
    for (let i = 0; i < 11; i++) {
      codes.push((await call('POST', '/auth/login', { body: { email: 'victim@test.dev', password: `guess${i}xx` } })).status);
    }
    assert.deepEqual(codes.slice(0, 10), Array(10).fill(401));
    assert.equal(codes[10], 429);
  });
  test('even the right password is blocked while locked out, with Retry-After', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'victim@test.dev', password: 'secret123' }),
    });
    assert.equal(res.status, 429);
    assert.ok(Number(res.headers.get('retry-after')) > 0);
    assert.match((await res.json()).message, /Too many attempts/);
  });
  test('lock-out is per account: another user can still sign in', async () => {
    await register('bystander@test.dev');
    const r = await call('POST', '/auth/login', { body: { email: 'bystander@test.dev', password: 'secret123' } });
    assert.equal(r.status, 200);
  });
  test('a successful login clears earlier failed attempts', async () => {
    await register('forgetful@test.dev');
    for (let i = 0; i < 9; i++) await call('POST', '/auth/login', { body: { email: 'forgetful@test.dev', password: `nope${i}xx` } });
    assert.equal((await call('POST', '/auth/login', { body: { email: 'forgetful@test.dev', password: 'secret123' } })).status, 200);
    for (let i = 0; i < 9; i++) {
      assert.equal((await call('POST', '/auth/login', { body: { email: 'forgetful@test.dev', password: `again${i}xx` } })).status, 401);
    }
  });
  test('reset emails are capped per address', async () => {
    const codes = [];
    for (let i = 0; i < 6; i++) codes.push((await call('POST', '/auth/forgot-password', { body: { email: 'spam-target@test.dev' } })).status);
    assert.deepEqual(codes, [200, 200, 200, 200, 200, 429]);
  });
});
