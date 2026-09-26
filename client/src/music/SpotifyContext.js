import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  isSpotifyConfigured, isSpotifyConnected, startSpotifyLogin, disconnectSpotify,
  getSpotifyToken, spotifyApi,
} from './spotifyAuth';
import { announceSource, onOtherSource } from './source';

// Spotify inside FitPulse.
// - Desktop browsers: the Web Playback SDK turns this tab into a Spotify
//   device ("FitPulse"), so music plays inside the app.
// - Phones: Spotify doesn't support the SDK on mobile browsers, so FitPulse
//   becomes a remote for the Spotify app on the phone (Spotify Connect). Music
//   keeps playing with the screen locked, and every control still works from
//   inside FitPulse.
// Both need Spotify Premium (Spotify's rule for third-party playback control).
const SpotifyContext = createContext(null);
export const useSpotify = () => useContext(SpotifyContext);

let sdkPromise;
const loadSdk = () => {
  if (window.Spotify?.Player) return Promise.resolve(window.Spotify);
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      window.onSpotifyWebPlaybackSDKReady = () => resolve(window.Spotify);
      const s = document.createElement('script');
      s.src = 'https://sdk.scdn.co/spotify-player.js';
      s.async = true;
      s.onerror = () => { sdkPromise = null; reject(new Error('Could not load Spotify player')); };
      document.head.appendChild(s);
    });
  }
  return sdkPromise;
};

// Normalise a Spotify track object to the shape the MiniPlayer uses
const toTrack = (t) => t && ({
  id: t.id || t.uri,
  uri: t.uri,
  title: t.name,
  channel: (t.artists || []).map(a => a.name).join(', '),
  thumbnail: (t.album?.images || []).slice(-2)[0]?.url || t.album?.images?.[0]?.url,
});

export function SpotifyProvider({ children }) {
  const configured = isSpotifyConfigured();
  const [connected, setConnected] = useState(() => configured && isSpotifyConnected());
  const [profile, setProfile] = useState(null);
  const [deviceId, setDeviceId] = useState(null);      // our in-browser device (desktop)
  const [playback, setPlayback] = useState(null);      // last GET /me/player
  const [error, setError] = useState('');
  const [volume, setVolumeState] = useState(70);
  const sdkPlayer = useRef(null);

  const report = useCallback((err) => setError(err?.message || String(err)), []);

  // Profile (also tells us whether the account is Premium)
  useEffect(() => {
    if (!connected) { setProfile(null); return; }
    spotifyApi('/me').then(setProfile).catch(err => {
      if (err.status === 401) { disconnectSpotify(); setConnected(false); }
      report(err);
    });
  }, [connected, report]);

  // Desktop: register this tab as a Spotify device
  useEffect(() => {
    if (!connected) return;
    let player;
    loadSdk().then(Spotify => {
      player = new Spotify.Player({
        name: 'FitPulse',
        getOAuthToken: cb => getSpotifyToken().then(cb).catch(report),
        volume: 0.7,
      });
      player.addListener('ready', ({ device_id }) => setDeviceId(device_id));
      player.addListener('not_ready', () => setDeviceId(null));
      // initialization_error = unsupported browser (e.g. mobile) → remote-control mode
      player.addListener('initialization_error', () => setDeviceId(null));
      player.addListener('account_error', () => report(new Error('Spotify Premium is needed to play music in FitPulse')));
      player.addListener('player_state_changed', s => s && setPlayback(p => ({
        ...p,
        is_playing: !s.paused,
        progress_ms: s.position,
        item: s.track_window.current_track ? { ...s.track_window.current_track, duration_ms: s.duration } : p?.item,
      })));
      player.connect();
      sdkPlayer.current = player;
    }).catch(() => { /* SDK blocked → remote-control mode still works */ });
    return () => { player?.disconnect(); sdkPlayer.current = null; };
  }, [connected, report]);

  // Poll the player state while connected and the tab is visible
  const refresh = useCallback(async () => {
    try {
      const data = await spotifyApi('/me/player');
      setPlayback(data); // null = nothing playing anywhere
      if (data?.device?.volume_percent != null) setVolumeState(data.device.volume_percent);
    } catch (err) { if (err.status === 401) { disconnectSpotify(); setConnected(false); } }
  }, []);

  useEffect(() => {
    if (!connected) return;
    refresh();
    const t = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 2000);
    return () => clearInterval(t);
  }, [connected, refresh]);

  // Local progress tick between polls so the seek bar moves smoothly
  useEffect(() => {
    if (!playback?.is_playing) return;
    const t = setInterval(() => setPlayback(p => p && ({ ...p, progress_ms: Math.min((p.progress_ms || 0) + 500, p.item?.duration_ms || 0) })), 500);
    return () => clearInterval(t);
  }, [playback?.is_playing]);

  // Which device to send commands to: this tab (desktop), else whatever is active, else first available
  const targetDevice = useCallback(async () => {
    if (deviceId) return deviceId;
    if (playback?.device?.id) return playback.device.id;
    const { devices = [] } = (await spotifyApi('/me/player/devices')) || {};
    const d = devices.find(x => x.is_active) || devices[0];
    if (!d) throw new Error('Open the Spotify app on your phone (play anything for a second), then tap play here again');
    return d.id;
  }, [deviceId, playback]);

  const command = useCallback(async (fn) => {
    setError('');
    try { await fn(); setTimeout(refresh, 400); } catch (err) { report(err); }
  }, [refresh, report]);

  // YouTube player started → pause Spotify
  useEffect(() => onOtherSource('spotify', () => {
    if (playback?.is_playing) spotifyApi('/me/player/pause', { method: 'PUT' }).catch(() => {});
  }), [playback?.is_playing]);

  // ---- actions (all go through the Web API so desktop + phone behave the same) ----
  const play = useCallback((body) => command(async () => {
    const device_id = await targetDevice();
    await spotifyApi('/me/player/play', { method: 'PUT', query: { device_id }, body });
    announceSource('spotify');
  }), [command, targetDevice]);

  const playContext = useCallback((contextUri, position = 0) =>
    play({ context_uri: contextUri, offset: { position } }), [play]);
  const playTracks = useCallback((uris, index = 0) =>
    play({ uris, offset: { position: index } }), [play]);

  const toggle = useCallback(() => command(async () => {
    if (playback?.is_playing) await spotifyApi('/me/player/pause', { method: 'PUT' });
    else {
      const device_id = await targetDevice();
      await spotifyApi('/me/player/play', { method: 'PUT', query: { device_id } });
      announceSource('spotify');
    }
  }), [command, playback?.is_playing, targetDevice]);

  const next = useCallback(() => command(() => spotifyApi('/me/player/next', { method: 'POST' })), [command]);
  const prev = useCallback(() => command(() => spotifyApi('/me/player/previous', { method: 'POST' })), [command]);
  const seek = useCallback((sec) => {
    setPlayback(p => p && ({ ...p, progress_ms: sec * 1000 }));
    command(() => spotifyApi('/me/player/seek', { method: 'PUT', query: { position_ms: Math.round(sec * 1000) } }));
  }, [command]);
  const setVolume = useCallback((v) => {
    setVolumeState(v);
    command(() => spotifyApi('/me/player/volume', { method: 'PUT', query: { volume_percent: v } }));
  }, [command]);
  // Mute = volume 0, remembering the previous level
  const lastVolume = useRef(70);
  const toggleMute = useCallback(() => {
    if (volume > 0) { lastVolume.current = volume; setVolume(0); } else setVolume(lastVolume.current || 70);
  }, [volume, setVolume]);
  const toggleShuffle = useCallback(() => command(() =>
    spotifyApi('/me/player/shuffle', { method: 'PUT', query: { state: String(!playback?.shuffle_state) } })), [command, playback?.shuffle_state]);
  // Spotify's repeat states: off → context (all) → track (one)
  const cycleRepeat = useCallback(() => {
    const nextState = { off: 'context', context: 'track', track: 'off' }[playback?.repeat_state || 'off'];
    command(() => spotifyApi('/me/player/repeat', { method: 'PUT', query: { state: nextState } }));
  }, [command, playback?.repeat_state]);

  const pause = useCallback(() => command(() => spotifyApi('/me/player/pause', { method: 'PUT' })), [command]);

  const connect = useCallback(() => startSpotifyLogin().catch(report), [report]);
  const disconnect = useCallback(() => {
    sdkPlayer.current?.disconnect();
    disconnectSpotify(); setConnected(false); setPlayback(null); setDeviceId(null);
  }, []);

  const current = toTrack(playback?.item);

  return (
    <SpotifyContext.Provider value={{
      configured, connected, profile, isPremium: profile?.product === 'premium',
      deviceId, deviceName: playback?.device?.name, error,
      current, playing: Boolean(playback?.is_playing),
      progress: (playback?.progress_ms || 0) / 1000, duration: (playback?.item?.duration_ms || 0) / 1000,
      volume, ready: true, index: 0, queue: [], source: 'spotify',
      muted: volume === 0, shuffle: Boolean(playback?.shuffle_state),
      repeat: { context: 'all', track: 'one' }[playback?.repeat_state] || 'off',
      toggleMute, toggleShuffle, cycleRepeat,
      connect, disconnect, playContext, playTracks, toggle, next, prev, seek, setVolume, clear: pause, refresh,
    }}>
      {children}
    </SpotifyContext.Provider>
  );
}
