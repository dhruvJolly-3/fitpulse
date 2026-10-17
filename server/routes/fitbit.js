const router = require('express').Router();
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const fitbit = require('../utils/fitbit');
const { syncProfileWeight } = require('./weight');

// Fitbit (Google) account link. Setup: dev.fitbit.com → Register an app
// (OAuth 2.0 type "Server"), callback URL = <API URL>/api/integrations/fitbit/callback,
// then set FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET and FITBIT_REDIRECT_URI.
const appUrl = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const notConfigured = (res) => res.status(503).json({ message: 'Fitbit sync is not set up on the server yet' });

router.get('/status', auth, (req, res) => {
  res.json({ configured: fitbit.configured(), connected: Boolean(req.user.fitbit?.userId), lastSyncAt: req.user.fitbit?.lastSyncAt || null });
});

// → { url } to open in the browser. `state` is a short-lived signed token so the
// callback knows which user is connecting (and can't be forged).
router.post('/connect', auth, (req, res) => {
  if (!fitbit.configured()) return notConfigured(res);
  const state = jwt.sign({ id: req.user._id, purpose: 'fitbit' }, process.env.JWT_SECRET, { expiresIn: '10m' });
  res.json({ url: fitbit.authorizeUrl(state) });
});

// Fitbit redirects the browser here; we store the tokens and send the user back to the app
router.get('/callback', asyncHandler(async (req, res) => {
  const back = (status) => res.redirect(`${appUrl()}/profile?fitbit=${status}`);
  if (!fitbit.configured()) return back('error');
  let state;
  try { state = jwt.verify(String(req.query.state || ''), process.env.JWT_SECRET); } catch { return back('error'); }
  if (state.purpose !== 'fitbit' || !req.query.code) return back(req.query.error === 'access_denied' ? 'denied' : 'error');
  try {
    await fitbit.connect(state.id, String(req.query.code));
    await fitbit.sync(state.id).then(() => syncProfileWeight(state.id)).catch(() => {}); // first sync; failures can be retried from the app
  } catch {
    return back('error');
  }
  back('connected');
}));

router.post('/sync', auth, asyncHandler(async (req, res) => {
  if (!fitbit.configured()) return notConfigured(res);
  const counts = await fitbit.sync(req.user._id);
  await syncProfileWeight(req.user._id);
  res.json({ synced: counts, lastSyncAt: new Date() });
}));

router.delete('/', auth, asyncHandler(async (req, res) => {
  await fitbit.disconnect(req.user._id);
  res.json({ connected: false });
}));

module.exports = router;
