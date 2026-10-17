import { isNativeApp, openExternal } from './platform';

// One-time setup when running as the Android / iOS app. No-op on the web.
//  • status bar colours follow the app theme
//  • Android back button goes back a page, and closes the app on the home screen
//  • links to other sites open in the in-app browser instead of replacing the app
//  • the native splash screen is hidden once React has rendered
export async function initNativeApp() {
  if (!isNativeApp) return;
  const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
    import('@capacitor/app'), import('@capacitor/status-bar'), import('@capacitor/splash-screen'),
  ]);

  document.documentElement.classList.add('native-app');

  const syncStatusBar = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
    StatusBar.setBackgroundColor({ color: dark ? '#0e0e10' : '#f1ebde' }).catch(() => {}); // Android only
  };
  syncStatusBar();
  new MutationObserver(syncStatusBar).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  App.addListener('backButton', ({ canGoBack }) => {
    const atRoot = ['/', '/auth'].includes(window.location.pathname);
    if (canGoBack && !atRoot) window.history.back();
    else App.exitApp();
  }).catch(() => {});

  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href]');
    if (!a) return;
    const url = new URL(a.href, window.location.href);
    if (url.origin === window.location.origin || !/^https?:$/.test(url.protocol)) return;
    e.preventDefault();
    openExternal(url.href);
  });

  // Let the first paint land before the splash fades
  requestAnimationFrame(() => setTimeout(() => SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {}), 150));
}
