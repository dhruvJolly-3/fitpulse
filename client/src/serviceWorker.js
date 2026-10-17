import { isNativeApp } from './platform';

// Registers public/sw.js in production builds only (the CRA dev server
// would otherwise get stuck serving cached files while you develop).
// Skipped inside the Android / iOS app: the app already ships its files locally.
export function registerServiceWorker() {
  if (isNativeApp || process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('Service worker registration failed:', err));
  });
}
