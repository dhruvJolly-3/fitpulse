import { Capacitor } from '@capacitor/core';

// True inside the Android / iOS app (Capacitor), false on the website.
// Everything mobile-specific is gated on this, so the web build behaves
// exactly as before.
export const isNativeApp = Capacitor.isNativePlatform();
export const nativePlatform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'

// Open a link outside the app: the in-app browser sheet on phones, a new tab on the web.
export const openExternal = async (url) => {
  if (!isNativeApp) { window.open(url, '_blank', 'noopener,noreferrer'); return; }
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer'); // the OS hands it to the default browser
  }
};
