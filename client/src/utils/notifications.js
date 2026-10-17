import { api } from '../context/AuthContext';
import { isNativeApp } from '../platform';

// Smart reminders on both platforms:
//   • Website: Web Push. The browser subscribes once and the server sends
//     reminders when they're due (and only if the goal isn't met yet).
//   • Android / iOS app: on-device notifications. We fetch the server's plan
//     (today's still-useful reminders + tomorrow's) and schedule them locally,
//     re-planning whenever the app opens or goes to the background.
const NATIVE_KEY = 'fp_native_reminders';

const urlB64ToUint8 = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
};

// What this device can do
export const notificationSupport = () => {
  if (isNativeApp) return { ok: true, kind: 'native' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    return { ok: false, reason: ios ? 'On iPhone, add FitPulse to your Home Screen (Share → Add to Home Screen) and open it from there to get reminders.' : "This browser doesn't support notifications." };
  }
  return { ok: true, kind: 'web' };
};

// ---- Web Push ----
const webSubscription = async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
};

export const isWebSubscribed = async () => Boolean(await webSubscription().catch(() => null));

export async function enableWebPush(publicKey) {
  if (!publicKey) throw new Error('Push notifications are not set up on the server yet.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them for this site in your browser settings.');
  const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'));
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(publicKey) }));
  await api.post('/reminders/subscribe', sub.toJSON());
}

export async function disableWebPush() {
  const sub = await webSubscription().catch(() => null);
  if (!sub) return;
  await api.delete('/reminders/subscribe', { data: { endpoint: sub.endpoint } }).catch(() => {});
  await sub.unsubscribe();
}

// ---- On-device (Capacitor) ----
// Stable numeric id per reminder (LocalNotifications needs 32-bit ints)
const numericId = (s) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) % 2147483647; };

const LocalNotifications = async () => (await import('@capacitor/local-notifications')).LocalNotifications;

export const nativeRemindersOn = () => { try { return localStorage.getItem(NATIVE_KEY) === '1'; } catch { return false; } };

export async function enableNativeReminders() {
  const LN = await LocalNotifications();
  const { display } = await LN.requestPermissions();
  if (display !== 'granted') throw new Error('Notifications are turned off for FitPulse. Turn them on in your phone settings.');
  localStorage.setItem(NATIVE_KEY, '1');
  await rescheduleNative();
}

export async function disableNativeReminders() {
  localStorage.removeItem(NATIVE_KEY);
  const LN = await LocalNotifications();
  const { notifications } = await LN.getPending();
  if (notifications.length) await LN.cancel({ notifications: notifications.map(n => ({ id: n.id })) });
}

// Replace pending reminders with a fresh plan from the server
export async function rescheduleNative() {
  if (!isNativeApp || !nativeRemindersOn() || !localStorage.getItem('fp_token')) return;
  const LN = await LocalNotifications();
  const { data: plan } = await api.get('/reminders/plan');
  const { notifications: pending } = await LN.getPending();
  if (pending.length) await LN.cancel({ notifications: pending.map(n => ({ id: n.id })) });
  if (!plan.length) return;
  await LN.schedule({
    notifications: plan.map(p => ({
      id: numericId(p.id), title: p.title, body: p.body,
      schedule: { at: new Date(p.at), allowWhileIdle: true },
      extra: { url: p.url },
    })),
  });
}

// Tapping a reminder opens the matching page
export async function listenForNativeTaps() {
  const LN = await LocalNotifications();
  LN.addListener('localNotificationActionPerformed', ({ notification }) => {
    const url = notification.extra?.url;
    if (url && url !== window.location.pathname) window.location.assign(url);
  }).catch(() => {});
}
