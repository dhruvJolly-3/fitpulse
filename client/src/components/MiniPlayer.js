import React, { useEffect, useRef, useState } from 'react';
import { useMusic } from '../music/YouTubeMusicContext';
import { useSpotify } from '../music/SpotifyContext';
import { canPopOut, usePopout, PopoutControls } from './PopoutPlayer';

// Now-playing bar pinned to the bottom of the app (above the phone tab bar).
// Main row: artwork, title, seek, prev / play-pause / next.
// Extras: shuffle, repeat (off → all → one), mute, playback speed
// (YouTube only — Spotify doesn't allow it), volume, and an "Up next"
// queue panel. On phones the extras live in an expandable tray.
const fmt = (s) => {
  const t = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};
const SPEEDS = [0.75, 1, 1.25, 1.5];

const Icon = ({ d, size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const I = {
  shuffle: <Icon d={<><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></>} />,
  repeat: <Icon d={<><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></>} />,
  volume: <Icon d={<><path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /></>} />,
  muted: <Icon d={<><path d="M11 5 6 9H2v6h4l5 4z" /><path d="m23 9-6 6M17 9l6 6" /></>} />,
  queue: <Icon d={<><path d="M3 6h13M3 12h13M3 18h9" /><path d="M20 15v6M17 18h6" /></>} />,
  popout: <Icon d={<><rect x="3" y="4" width="18" height="14" rx="2" /><rect x="11" y="10" width="8" height="6" rx="1" fill="currentColor" /></>} />,
  more: <Icon d={<><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>} />,
};

export default function MiniPlayer() {
  const yt = useMusic();
  const sp = useSpotify();
  const [showQueue, setShowQueue] = useState(false);
  const [showTray, setShowTray] = useState(false); // phone: extra controls
  const panel = useRef(null);
  const popout = usePopout();

  // Show whichever source is playing; otherwise the last one with a track loaded
  const m = sp.connected && sp.playing ? sp : yt.current ? yt : sp.connected && sp.current ? sp : null;

  // Close the pop-out window when nothing is playing any more
  const hasTrack = Boolean(m?.current);
  const { pipWindow, close: closePopout } = popout;
  useEffect(() => { if (!hasTrack && pipWindow) closePopout(); }, [hasTrack, pipWindow, closePopout]);

  // Close the queue panel when clicking outside it
  useEffect(() => {
    if (!showQueue) return;
    const onDown = (e) => { if (panel.current && !panel.current.contains(e.target)) setShowQueue(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showQueue]);

  if (!m?.current) return null;
  const isSpotify = m.source === 'spotify';
  const pct = m.duration ? (m.progress / m.duration) * 100 : 0;

  const extras = (
    <>
      <button className={`icon-btn mp-toggle ${m.shuffle ? 'on' : ''}`} onClick={m.toggleShuffle} title="Shuffle" aria-pressed={m.shuffle}>
        {I.shuffle}
      </button>
      <button className={`icon-btn mp-toggle ${m.repeat !== 'off' ? 'on' : ''}`} onClick={m.cycleRepeat}
        title={`Repeat: ${m.repeat}`} aria-label={`Repeat ${m.repeat}`}>
        {I.repeat}{m.repeat === 'one' && <span className="mp-badge">1</span>}
      </button>
      {!isSpotify && (
        <button className="mp-speed" title="Playback speed"
          onClick={() => m.setRate(SPEEDS[(SPEEDS.indexOf(m.rate) + 1) % SPEEDS.length])}>
          {m.rate}×
        </button>
      )}
      <button className="icon-btn" onClick={m.toggleMute} title={m.muted ? 'Unmute' : 'Mute'} aria-pressed={m.muted}>
        {m.muted ? I.muted : I.volume}
      </button>
      <input className="mp-volume" type="range" min={0} max={100} value={m.muted ? 0 : m.volume}
        onChange={e => m.setVolume(Number(e.target.value))} aria-label="Volume" title="Volume"
        style={{ '--fill': `${m.muted ? 0 : m.volume}%` }} />
      {canPopOut() && (
        <button className={`icon-btn mp-toggle ${popout.pipWindow ? 'on' : ''}`} title="Pop out player (controls over other apps)"
          onClick={() => (popout.pipWindow ? popout.close() : popout.open())}>
          {I.popout}
        </button>
      )}
      {!isSpotify && (
        <button className={`icon-btn mp-toggle ${showQueue ? 'on' : ''}`} onClick={() => setShowQueue(v => !v)} title="Up next">
          {I.queue}
        </button>
      )}
    </>
  );

  return (
    <div className="mini-player" role="region" aria-label="Music player" ref={panel}>
      {/* progress line across the top edge of the bar */}
      <div className="mp-line" style={{ width: `${pct}%` }} />

      <div className={`mp-art ${m.playing ? 'spin' : ''}`}>
        {m.current.thumbnail ? <img src={m.current.thumbnail} alt="" /> : <span />}
      </div>

      <div className="mp-info">
        <div className="mp-title" title={m.current.title}>{m.current.title}</div>
        <div className="mp-sub">
          <span className="mp-src">{isSpotify ? `Spotify${sp.deviceName ? ` · ${sp.deviceName}` : ''}` : 'YouTube'}</span>
          {m.error || (!m.ready ? 'Loading player…' : m.current.channel)}
        </div>
        <div className="mp-seek">
          <span>{fmt(m.progress)}</span>
          <input type="range" min={0} max={Math.max(1, Math.floor(m.duration))} value={Math.floor(m.progress)}
            onChange={e => m.seek(Number(e.target.value))} aria-label="Seek" disabled={!m.duration}
            style={{ '--fill': `${pct}%` }} />
          <span>{fmt(m.duration)}</span>
        </div>
      </div>

      <div className="mp-controls">
        <button className="icon-btn" onClick={m.prev} title="Previous" aria-label="Previous">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>
        </button>
        <button className={`mp-play ${m.playing ? 'playing' : ''}`} onClick={m.toggle} title={m.playing ? 'Pause' : 'Play'} aria-label={m.playing ? 'Pause' : 'Play'}>
          {m.playing
            ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>
            : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z"/></svg>}
        </button>
        <button className="icon-btn" onClick={m.next} title="Next" aria-label="Next"
          disabled={!isSpotify && !m.shuffle && m.repeat === 'off' && m.index >= m.queue.length - 1}>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>
        </button>
      </div>

      <div className="mp-extras">{extras}</div>
      <button className="icon-btn mp-more" onClick={() => setShowTray(v => !v)} title="More controls">{I.more}</button>
      <button className="icon-btn mp-close" onClick={m.clear} title="Stop & close" aria-label="Close player">✕</button>

      {showTray && <div className="mp-tray">{extras}</div>}
      <PopoutControls win={popout.pipWindow} m={m} />

      {showQueue && !isSpotify && (
        <div className="mp-queue">
          <div className="mp-queue-h">
            <b>Up next</b>
            <span className="label">{m.queue.length} songs{m.shuffle ? ' · shuffle' : ''}{m.repeat !== 'off' ? ` · repeat ${m.repeat}` : ''}</span>
          </div>
          <div className="mp-queue-list">
            {m.queue.map((t, i) => (
              <div key={`${t.id}${i}`} className={`mp-q ${i === m.index ? 'on' : ''}`}>
                <button onClick={() => m.jumpTo(i)} className="mp-q-main">
                  <span className="mp-q-n">{i === m.index && m.playing ? <span className="eq"><i /><i /><i /></span> : i + 1}</span>
                  <span className="mp-q-t">{t.title}<small>{t.channel}</small></span>
                </button>
                {i !== m.index && <button className="icon-btn" onClick={() => m.removeAt(i)} title="Remove">✕</button>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
