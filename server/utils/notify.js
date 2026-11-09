const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

// Delivers a notification to every device a user has registered.
//
// Web Push needs a VAPID key pair (generate once with `npx web-push
// generate-vapid-keys`). Without VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY,
// browser delivery is switched off; Expo (mobile) delivery needs no keys.
// NOTIFY_DRY_RUN=1 records messages in memory instead of sending (tests).
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const outbox = []; // dry-run only

const webPushReady = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
let vapidSet = false;
const ensureVapid = () => {
  if (vapidSet || !webPushReady()) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:no-reply@fitpulse.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  vapidSet = true;
};

const sendWeb = async (sub, payload) => {
  ensureVapid();
  if (!vapidSet) return 'disabled';
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload), { TTL: 60 * 60 });
    return 'ok';
  } catch (err) {
    // 404/410: the browser dropped the subscription (site data cleared, app uninstalled)
    if (err.statusCode === 404 || err.statusCode === 410) return 'gone';
    console.warn('Web push failed:', err.statusCode || err.message);
    return 'error';
  }
};

const sendExpo = async (sub, payload) => {
  try {
    const r = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: sub.endpoint,
        title: payload.title,
        body: payload.body,
        sound: 'default',
        data: { url: payload.url, tag: payload.tag },
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await r.json().catch(() => ({}));
    if (data?.data?.details?.error === 'DeviceNotRegistered') return 'gone';
    return r.ok && data?.data?.status !== 'error' ? 'ok' : 'error';
  } catch (err) {
    console.warn('Expo push failed:', err.message);
    return 'error';
  }
};

// payload: { title, body, url?, tag? } → { delivered, devices }
const sendToUser = async (userId, payload) => {
  const subs = await PushSubscription.find({ user: userId });
  if (process.env.NOTIFY_DRY_RUN === '1') {
    outbox.push({ user: String(userId), ...payload, devices: subs.length });
    return { delivered: subs.length, devices: subs.length };
  }
  let delivered = 0;
  for (const sub of subs) {
    const result = sub.type === 'web' ? await sendWeb(sub, payload) : await sendExpo(sub, payload);
    if (result === 'ok') {
      delivered++;
      await PushSubscription.updateOne({ _id: sub._id }, { lastSuccessAt: new Date() });
    } else if (result === 'gone') {
      await PushSubscription.deleteOne({ _id: sub._id });
    }
  }
  return { delivered, devices: subs.length };
};

module.exports = { sendToUser, webPushReady, outbox };
