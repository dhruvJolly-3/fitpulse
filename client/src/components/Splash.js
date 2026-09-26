import React, { useEffect, useState } from 'react';
import Pulse from './Pulse';

// Full-screen loading screen shown while FitPulse checks your session.
// A heartbeat line draws across the screen, the logo pulses in time, and
// rotating one-liners keep it lively. If loading takes a while (the free
// Render server can take ~30–50s to wake up) it says so instead of looking stuck.
const LINES = [
  'Warming up',
  'Loading your targets',
  'Syncing today’s logs',
  'Lacing up',
];

export default function Splash() {
  const [line, setLine] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setLine(i => (i + 1) % LINES.length), 1600);
    const s = setTimeout(() => setSlow(true), 6000);
    return () => { clearInterval(t); clearTimeout(s); };
  }, []);

  return (
    <div className="splash" role="status" aria-live="polite">
      {/* soft moving glow blobs in the brand colours */}
      <div className="splash-blob a" />
      <div className="splash-blob b" />

      {/* heartbeat line sweeping across the whole screen */}
      <svg className="splash-ecg" viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true">
        <path className="trace" d="M0 100 H430 L470 100 L500 40 L540 170 L575 70 L600 100 H760 L790 100 L810 80 L830 100 H1200" />
        <circle className="dot" r="6" />
      </svg>

      {/* Pulse the mascot jogging on the heartbeat line */}
      <div className="splash-mascot"><Pulse mood="run" size={132} /></div>

      <div className="splash-word">FitPulse<b>.</b></div>
      <div className="splash-line" key={line}>
        {LINES[line]}<span className="dots"><i>.</i><i>.</i><i>.</i></span>
      </div>
      {slow && <p className="splash-slow">Waking up the server, the first load can take up to a minute.</p>}
    </div>
  );
}
