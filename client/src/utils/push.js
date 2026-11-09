import { api } from '../context/AuthContext';

// Web Push helpers for the reminders settings.
// Browser support: Chrome/Edge/Firefox on desktop and Android; on iPhone,
// Safari only delivers web push to the app after "Add to Home Screen"
// (iOS 16.4+). The service worker is only registered in production builds.

const urlBase64ToUint8Array = (base64) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
};

export const pushSupport = () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    return { ok: false, reason: iOS ? 'On iPhone, add FitPulse to your Home Screen first, then turn reminders on from there.' : 'This browser does not support push notifications.' };
  }
  if (process.env.NODE_ENV !== 'production') {
    return { ok: false, reason: 'Push notifications only work in the deployed (production) build.' };
  }
  return { ok: true };
};

// Ask permission, subscribe this browser and register it with the API
export const enablePush = async (vapidPublicKey) => {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them in your browser’s site settings.');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) });
  }
  const { data } = await api.post('/reminders/devices', { type: 'web', subscription: sub.toJSON() });
  return data.devices;
};

export const currentSubscription = async () => {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
};

export const disablePush = async () => {
  const sub = await currentSubscription();
  if (!sub) return;
  await api.delete('/reminders/devices', { data: { endpoint: sub.endpoint } }).catch(() => {});
  await sub.unsubscribe();
};
