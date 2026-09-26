import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { announceSource, onOtherSource } from './source';

// In-app music player built on the YouTube IFrame Player API.
// One hidden player lives here, above the router, so music keeps playing
// while you move between pages. Songs come from our /api/videos/music search.
//
// Exposes: queue, index, current, playing, progress/duration, volume, ready,
// error, and actions playList(), toggle(), next(), prev(), seek(),
// setVolume(), enqueue(), clear().

const MusicContext = createContext(null);
export const useMusic = () => useContext(MusicContext);

// Load the IFrame API script once; resolves with window.YT.
let apiPromise;
const loadYouTubeApi = () => {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = () => { apiPromise = null; reject(new Error('Could not load the music player')); };
      document.head.appendChild(s);
    });
  }
  return apiPromise;
};

// YT.PlayerState values
const ENDED = 0, PLAYING = 1, PAUSED = 2;

export function MusicProvider({ children }) {
  const host = useRef(null);       // div the hidden iframe replaces
  const player = useRef(null);
  const pending = useRef(null);    // video id chosen before the player finished loading
  const [ready, setReady] = useState(false);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(80);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [rate, setRateState] = useState(1);          // playback speed
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off');       // off | all | one
  // Mirrors for the player's event callbacks, which are created only once
  const mode = useRef({ shuffle, repeat });
  mode.current = { shuffle, repeat };

  // Refs mirror state for the player's event callbacks (created once)
  const state = useRef({ queue, index });
  state.current = { queue, index };

  const loadAt = useCallback((i, list = state.current.queue) => {
    const track = list[i];
    if (!track) return;
    setIndex(i); setProgress(0); setDuration(0); setError('');
    // Player still loading (slow network): remember the pick and start it in onReady
    if (!player.current?.loadVideoById) { pending.current = track.id; return; }
    player.current.loadVideoById(track.id); // autoplays
    announceSource('youtube');
  }, []);

  // Next track, honouring shuffle and repeat-all. `auto` = the song ended by itself.
  const next = useCallback((auto = false) => {
    const { queue: q, index: i } = state.current;
    const { shuffle: sh, repeat: rp } = mode.current;
    if (auto && rp === 'one') { player.current?.seekTo(0, true); player.current?.playVideo(); return; }
    if (sh && q.length > 1) {
      let j = i;
      while (j === i) j = Math.floor(Math.random() * q.length);
      loadAt(j);
    } else if (i + 1 < q.length) loadAt(i + 1);
    else if (rp === 'all' && q.length) loadAt(0);
    else { player.current?.stopVideo(); setPlaying(false); }
  }, [loadAt]);

  // Create the hidden player once the API script is ready
  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then(YT => {
      if (cancelled || !host.current) return;
      player.current = new YT.Player(host.current, {
        width: 1, height: 1,
        host: 'https://www.youtube-nocookie.com',
        playerVars: { playsinline: 1, controls: 0, disablekb: 1, rel: 0 },
        events: {
          onReady: (e) => {
            e.target.setVolume(80); setReady(true);
            if (pending.current) { e.target.loadVideoById(pending.current); pending.current = null; }
          },
          onStateChange: (e) => {
            if (e.data === PLAYING) { setPlaying(true); setDuration(e.target.getDuration() || 0); }
            else if (e.data === PAUSED) setPlaying(false);
            else if (e.data === ENDED) next(true);
          },
          // 2/5/100/101/150 = bad id, HTML5 error, removed, or embedding blocked → skip it
          onError: () => { setError('That track can’t be played here, skipping…'); setTimeout(() => next(true), 800); },
        },
      });
    }).catch(err => !cancelled && setError(err.message));
    return () => { cancelled = true; player.current?.destroy?.(); player.current = null; };
  }, [next]);

  // Progress ticker while playing
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      const p = player.current;
      if (p?.getCurrentTime) { setProgress(p.getCurrentTime()); setDuration(p.getDuration() || 0); }
    }, 500);
    return () => clearInterval(t);
  }, [playing]);

  // ---- actions ----
  // Replace the queue with `list` and start at `start` (called from a click,
  // which lets mobile browsers allow audio playback)
  const playList = useCallback((list, start = 0) => {
    setQueue(list);
    state.current = { queue: list, index: start };
    loadAt(start, list);
  }, [loadAt]);

  const enqueue = useCallback((track) => {
    setQueue(q => (q.some(t => t.id === track.id) ? q : [...q, track]));
  }, []);

  const toggle = useCallback(() => {
    const p = player.current;
    if (!p) return;
    if (playing) p.pauseVideo();
    else if (state.current.index < 0 && state.current.queue.length) loadAt(0);
    else { p.playVideo(); announceSource('youtube'); }
  }, [playing, loadAt]);

  const prev = useCallback(() => {
    // Like most players: restart the song if we're more than 3s in
    if (player.current?.getCurrentTime?.() > 3 || state.current.index <= 0) player.current?.seekTo(0, true);
    else loadAt(state.current.index - 1);
  }, [loadAt]);

  const seek = useCallback((sec) => { player.current?.seekTo(sec, true); setProgress(sec); }, []);
  const setVolume = useCallback((v) => { player.current?.setVolume(v); setVolumeState(v); }, []);
  const toggleMute = useCallback(() => {
    const p = player.current;
    if (!p) return;
    if (p.isMuted?.() || muted) { p.unMute(); setMuted(false); } else { p.mute(); setMuted(true); }
  }, [muted]);
  // YouTube supports 0.25–2x; we offer the useful range
  const setRate = useCallback((r) => { player.current?.setPlaybackRate?.(r); setRateState(r); }, []);
  const toggleShuffle = useCallback(() => setShuffle(v => !v), []);
  const cycleRepeat = useCallback(() => setRepeat(v => (v === 'off' ? 'all' : v === 'all' ? 'one' : 'off')), []);
  const jumpTo = useCallback((i) => loadAt(i), [loadAt]);
  const removeAt = useCallback((i) => {
    setQueue(q => q.filter((_, k) => k !== i));
    setIndex(cur => (i < cur ? cur - 1 : cur));
  }, []);

  const clear = useCallback(() => {
    player.current?.stopVideo(); setQueue([]); setIndex(-1); setPlaying(false); setProgress(0);
  }, []);

  // Spotify started → stop YouTube so they never play over each other
  useEffect(() => onOtherSource('youtube', () => player.current?.pauseVideo?.()), []);

  const current = queue[index] || null;

  // Lock-screen / headphone controls where the browser supports Media Session
  useEffect(() => {
    if (!('mediaSession' in navigator) || !current) return;
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: current.title, artist: current.channel,
      artwork: current.thumbnail ? [{ src: current.thumbnail, sizes: '320x180' }] : [],
    });
    const ms = navigator.mediaSession;
    // try/catch: older browsers throw on actions they don't know
    const on = (action, fn) => { try { ms.setActionHandler(action, fn); } catch { /* unsupported */ } };
    on('play', () => { player.current?.playVideo(); announceSource('youtube'); });
    on('pause', () => player.current?.pauseVideo());
    on('nexttrack', () => next(false));
    on('previoustrack', prev);
    on('seekto', (d) => d.seekTime != null && player.current?.seekTo(d.seekTime, true));
    on('seekbackward', (d) => player.current?.seekTo(Math.max(0, (player.current.getCurrentTime?.() || 0) - (d.seekOffset || 10)), true));
    on('seekforward', (d) => player.current?.seekTo((player.current.getCurrentTime?.() || 0) + (d.seekOffset || 10), true));
    on('stop', () => player.current?.stopVideo());
  }, [current, next, prev]);

  // Keep the OS media widget (lock screen, notification, Chrome's media hub,
  // keyboard media keys) in sync with play state and position
  useEffect(() => {
    if (!('mediaSession' in navigator) || !current) return;
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    if (duration > 0 && navigator.mediaSession.setPositionState) {
      try {
        navigator.mediaSession.setPositionState({ duration, playbackRate: rate, position: Math.min(progress, duration) });
      } catch { /* invalid state while a new track loads */ }
    }
  }, [current, playing, progress, duration, rate]);

  return (
    <MusicContext.Provider value={{
      source: 'youtube', ready, queue, index, current, playing, progress, duration, volume, error,
      muted, rate, shuffle, repeat,
      playList, enqueue, toggle, next: () => next(false), prev, seek, setVolume, clear,
      toggleMute, setRate, toggleShuffle, cycleRepeat, jumpTo, removeAt,
    }}>
      {children}
      {/* Hidden audio source; kept on-screen at 1px because some mobile browsers pause off-screen iframes */}
      <div aria-hidden="true" style={{ position: 'fixed', left: 0, bottom: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}>
        <div ref={host} />
      </div>
    </MusicContext.Provider>
  );
}
