import React from 'react';
import { useMusic } from '../music/YouTubeMusicContext';
import { useSpotify } from '../music/SpotifyContext';

// Now-playing bar pinned to the bottom of the app (above the phone tab bar).
// Visible whenever something is queued; controls: prev, play/pause, next,
// seek, volume and close.
const fmt = (s) => {
  const t = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

export default function MiniPlayer() {
  const yt = useMusic();
  const sp = useSpotify();
  // Show whichever source is playing; otherwise the last one with a track loaded
  const m = sp.connected && sp.playing ? sp : yt.current ? yt : sp.connected && sp.current ? sp : null;
  if (!m?.current) return null;
  const isSpotify = m === sp;

  return (
    <div className="mini-player" role="region" aria-label="Music player">
      <img src={m.current.thumbnail} alt="" />
      <div className="mp-info">
        <div className="mp-title" title={m.current.title}>{m.current.title}</div>
        <div className="mp-sub">
          {isSpotify && <span className="mp-src">Spotify{sp.deviceName ? ` · ${sp.deviceName}` : ''}</span>}
          {m.error || (!m.ready ? 'Loading player…' : m.current.channel)}
        </div>
        <div className="mp-seek">
          <span>{fmt(m.progress)}</span>
          <input type="range" min={0} max={Math.max(1, Math.floor(m.duration))} value={Math.floor(m.progress)}
            onChange={e => m.seek(Number(e.target.value))} aria-label="Seek" disabled={!m.duration} />
          <span>{fmt(m.duration)}</span>
        </div>
      </div>
      <div className="mp-controls">
        <button className="icon-btn" onClick={m.prev} title="Previous" aria-label="Previous">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>
        </button>
        <button className="mp-play" onClick={m.toggle} title={m.playing ? 'Pause' : 'Play'} aria-label={m.playing ? 'Pause' : 'Play'}>
          {m.playing
            ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>
            : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z"/></svg>}
        </button>
        <button className="icon-btn" onClick={m.next} title="Next" aria-label="Next" disabled={!isSpotify && m.index >= m.queue.length - 1}>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>
        </button>
      </div>
      <input className="mp-volume" type="range" min={0} max={100} value={m.volume}
        onChange={e => m.setVolume(Number(e.target.value))} aria-label="Volume" title="Volume" />
      <button className="icon-btn mp-close" onClick={m.clear} title="Stop & close" aria-label="Close player">✕</button>
    </div>
  );
}
