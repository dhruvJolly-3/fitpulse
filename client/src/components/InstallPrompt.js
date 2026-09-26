import React, { useEffect, useState } from 'react';

// "Install FitPulse" banner for phones.
// - Android / Chrome: uses the browser's beforeinstallprompt event for a
//   one-tap install.
// - iPhone / iPad Safari: iOS has no install API, so we show the
//   Share → "Add to Home Screen" steps instead.
// Hidden when already running as an installed app or after "Not now".
const DISMISS_KEY = 'fp_install_dismissed';

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS reports as Mac
const isMobile = () => window.matchMedia?.('(max-width: 920px)').matches;
const wasDismissed = () => { try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; } };

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null); // Android install event
  const [hidden, setHidden] = useState(() => isStandalone() || wasDismissed() || !isMobile());

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => setHidden(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => { setHidden(true); try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ } };

  const install = async () => {
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') setHidden(true);
    setDeferred(null);
  };

  // Nothing to offer: not iOS and the browser hasn't made the app installable (yet)
  if (hidden || (!deferred && !isIOS())) return null;

  return (
    <div className="install-banner">
      <img src="/apple-touch-icon.png" alt="" />
      <div className="txt">
        <b>Install FitPulse</b>
        {deferred
          ? <span>Add it to your home screen, full screen with no browser bar.</span>
          : <span>Tap <b>Share</b> <ShareIcon /> then <b>Add to Home Screen</b>.</span>}
      </div>
      {deferred && <button className="btn lime sm" onClick={install}>Install</button>}
      <button className="icon-btn" onClick={dismiss} title="Not now">✕</button>
    </div>
  );
}

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: '-2px' }}>
    <path d="M12 3v12M7 8l5-5 5 5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </svg>
);
