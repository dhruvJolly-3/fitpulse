import React, { useEffect, useState } from 'react';
import { api } from '../context/AuthContext';
import { useMusic } from '../music/YouTubeMusicContext';
import { useSpotify } from '../music/SpotifyContext';
import { spotifyApi } from '../music/spotifyAuth';
import {
  isYouTubeAccountConfigured, isYouTubeConnected, connectYouTube, disconnectYouTube,
  myPlaylists, playlistTracks,
} from '../music/youtubeAccount';

// Workout music, three ways, all controlled from the MiniPlayer bar:
//   Search    → any song on YouTube (needs YOUTUBE_API_KEY on the server)
//   YouTube   → your own YouTube / YouTube Music playlists (Google login)
//   Spotify   → your Spotify playlists, Liked Songs and search (Spotify login, Premium)
const MOODS = ['Gym motivation', 'Hip hop workout', 'Bollywood workout', 'EDM running', 'Rock workout', 'Lo-fi cooldown'];
const TABS = [['search', 'Search'], ['youtube', 'YouTube'], ['spotify', 'Spotify']];

export default function MusicPanel() {
  const music = useMusic();
  const spotify = useSpotify();
  const [tab, setTab] = useState(() => (spotify.connected ? 'spotify' : 'search'));

  return (
    <div className="card">
      <div className="card-h">
        <h3>Workout <span className="serif-it">music</span></h3>
        {music.queue.length > 0 && <span className="label">{music.queue.length} in queue</span>}
      </div>
      <div className="seg" style={{ marginBottom: 14 }}>
        {TABS.map(([k, label]) => (
          <button key={k} type="button" className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      {tab === 'search' && <SearchTab />}
      {tab === 'youtube' && <YouTubeTab />}
      {tab === 'spotify' && <SpotifyTab />}
    </div>
  );
}

// One row in any song list
function TrackRow({ track, active, playing, onPlay, onAdd }) {
  return (
    <div className={`track ${active ? 'on' : ''}`}>
      <button className="track-main" onClick={onPlay} title="Play">
        {track.thumbnail ? <img src={track.thumbnail} alt="" loading="lazy" /> : <span className="track-ph" />}
        <div className="meta">
          <div className="tt">{track.title}</div>
          <span className="label">{track.channel}</span>
        </div>
        {active && playing && <span className="eq"><i /><i /><i /></span>}
      </button>
      {onAdd && <button className="icon-btn" onClick={onAdd} title="Add to queue">+</button>}
    </div>
  );
}

// Playlist tile grid (YouTube + Spotify)
function PlaylistGrid({ items, onOpen }) {
  return (
    <div className="pl-grid">
      {items.map(p => (
        <button key={p.id} className="pl-tile" onClick={() => onOpen(p)}>
          {p.image ? <img src={p.image} alt="" loading="lazy" /> : <span className="track-ph" />}
          <div className="tt">{p.name}</div>
          {p.count != null && <span className="label">{p.count} songs</span>}
        </button>
      ))}
    </div>
  );
}

// ---------------- Search (YouTube catalogue) ----------------
function SearchTab() {
  const music = useMusic();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = async (term) => {
    if (!term || term.trim().length < 2) return;
    setLoading(true); setError('');
    try {
      const { data } = await api.get('/videos/music', { params: { q: term.trim() } });
      setResults(data);
      if (!data.length) setError('No songs found — try another search');
    } catch (err) {
      setResults([]);
      setError(err.response?.data?.message || 'Music search failed');
    } finally { setLoading(false); }
  };

  return (
    <>
      <form onSubmit={e => { e.preventDefault(); search(q); }} style={{ display: 'flex', gap: 8 }}>
        <div className="field" style={{ margin: 0, flex: 1 }}>
          <input placeholder="Search songs or artists" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <button className="btn primary sm" type="submit" disabled={loading}>{loading ? '…' : 'Search'}</button>
      </form>
      <div className="chips" style={{ margin: '12px 0' }}>
        {MOODS.map(m => <button key={m} className="chip" type="button" onClick={() => { setQ(m); search(m); }}>{m}</button>)}
      </div>
      {error && <div className="notice">{error}</div>}
      {loading && <div className="skeleton" style={{ height: 160 }} />}
      {!loading && results.length > 0 && (
        <div className="track-list">
          {results.map((t, i) => (
            <TrackRow key={t.id} track={t} active={music.current?.id === t.id} playing={music.playing}
              onPlay={() => music.playList(results, i)} onAdd={() => music.enqueue(t)} />
          ))}
        </div>
      )}
    </>
  );
}

// ---------------- Your YouTube / YouTube Music playlists ----------------
function YouTubeTab() {
  const music = useMusic();
  const [connected, setConnected] = useState(isYouTubeConnected);
  const [playlists, setPlaylists] = useState(null);
  const [open, setOpen] = useState(null);   // { playlist, tracks }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  useEffect(() => { if (connected && !playlists) run(async () => setPlaylists(await myPlaylists())); }, [connected, playlists]);

  if (!isYouTubeAccountConfigured()) {
    return <div className="notice">YouTube login isn’t set up yet (needs <code>REACT_APP_GOOGLE_CLIENT_ID</code>). Use the Search tab meanwhile.</div>;
  }
  if (!connected) {
    return (
      <>
        <p className="muted-p">Sign in with Google to play your own YouTube and YouTube Music playlists here.</p>
        {error && <div className="alert">{error}</div>}
        <button className="btn primary sm" disabled={busy} onClick={() => run(async () => { await connectYouTube(); setConnected(true); })}>
          {busy ? 'Connecting…' : 'Connect YouTube'}
        </button>
      </>
    );
  }

  return (
    <>
      <div className="music-bar">
        {open ? <button className="link-btn" onClick={() => setOpen(null)}>← Playlists</button> : <span className="label">Your playlists</span>}
        <button className="link-btn" onClick={() => { disconnectYouTube(); setConnected(false); setPlaylists(null); setOpen(null); }}>Disconnect</button>
      </div>
      {error && <div className="alert">{error}</div>}
      {busy && <div className="skeleton" style={{ height: 160 }} />}
      {!busy && !open && playlists && (playlists.length
        ? <PlaylistGrid items={playlists} onOpen={p => run(async () => setOpen({ playlist: p, tracks: await playlistTracks(p.id) }))} />
        : <div className="notice">No playlists on this Google account yet.</div>)}
      {!busy && open && (
        <>
          <div className="music-bar">
            <b>{open.playlist.name}</b>
            <button className="btn lime sm" onClick={() => open.tracks.length && music.playList(open.tracks, 0)}>▶ Play all</button>
          </div>
          <div className="track-list">
            {open.tracks.map((t, i) => (
              <TrackRow key={`${t.id}${i}`} track={t} active={music.current?.id === t.id} playing={music.playing}
                onPlay={() => music.playList(open.tracks, i)} onAdd={() => music.enqueue(t)} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ---------------- Spotify ----------------
const toTrack = (t) => ({
  id: t.id, uri: t.uri, title: t.name,
  channel: (t.artists || []).map(a => a.name).join(', '),
  thumbnail: (t.album?.images || []).slice(-2)[0]?.url,
});

function SpotifyTab() {
  const sp = useSpotify();
  const [view, setView] = useState('playlists'); // playlists | liked | search
  const [playlists, setPlaylists] = useState(null);
  const [liked, setLiked] = useState(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  useEffect(() => {
    if (!sp.connected) return;
    if (view === 'playlists' && !playlists) run(async () => {
      const d = await spotifyApi('/me/playlists', { query: { limit: 50 } });
      setPlaylists((d.items || []).filter(Boolean).map(p => ({
        id: p.id, uri: p.uri, name: p.name, count: p.tracks?.total, image: p.images?.[0]?.url,
      })));
    });
    if (view === 'liked' && !liked) run(async () => {
      const d = await spotifyApi('/me/tracks', { query: { limit: 50 } });
      setLiked((d.items || []).map(i => toTrack(i.track)));
    });
  }, [sp.connected, view, playlists, liked]);

  if (!sp.configured) {
    return <div className="notice">Spotify isn’t set up yet (needs <code>REACT_APP_SPOTIFY_CLIENT_ID</code>).</div>;
  }
  if (!sp.connected) {
    return (
      <>
        <p className="muted-p">Log in with Spotify to play your playlists and Liked Songs right here, with play, pause, skip and volume controls. Needs Spotify Premium.</p>
        {sp.error && <div className="alert">{sp.error}</div>}
        <button className="btn primary sm spotify-btn" onClick={sp.connect}>Connect Spotify</button>
      </>
    );
  }

  const search = (e) => {
    e.preventDefault();
    if (q.trim().length < 2) return;
    run(async () => {
      const d = await spotifyApi('/search', { query: { q: q.trim(), type: 'track', limit: 20 } });
      setResults((d.tracks?.items || []).map(toTrack));
    });
  };

  const list = view === 'liked' ? liked : results;

  return (
    <>
      <div className="music-bar">
        <span className="label">{sp.profile?.display_name || 'Spotify'}{sp.deviceId ? ' · playing in FitPulse' : ' · controls your Spotify app'}</span>
        <button className="link-btn" onClick={sp.disconnect}>Disconnect</button>
      </div>
      {sp.profile && !sp.isPremium && (
        <div className="notice">This Spotify account isn’t Premium. Spotify only lets apps control playback for Premium accounts, so you can browse but not play.</div>
      )}
      {(error || sp.error) && <div className="alert">{error || sp.error}</div>}

      <div className="chips" style={{ marginBottom: 12 }}>
        {[['playlists', 'Playlists'], ['liked', 'Liked Songs'], ['search', 'Search']].map(([k, label]) => (
          <button key={k} className={`chip ${view === k ? 'on' : ''}`} onClick={() => setView(k)}>{label}</button>
        ))}
      </div>

      {view === 'search' && (
        <form onSubmit={search} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div className="field" style={{ margin: 0, flex: 1 }}>
            <input placeholder="Search Spotify" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <button className="btn primary sm" type="submit" disabled={busy}>Search</button>
        </form>
      )}

      {busy && <div className="skeleton" style={{ height: 160 }} />}
      {!busy && view === 'playlists' && playlists && (playlists.length
        ? <PlaylistGrid items={playlists} onOpen={p => sp.playContext(p.uri)} />
        : <div className="notice">No playlists on this Spotify account.</div>)}
      {!busy && view !== 'playlists' && list && (
        <div className="track-list">
          {list.map((t, i) => (
            <TrackRow key={`${t.id}${i}`} track={t} active={sp.current?.uri === t.uri} playing={sp.playing}
              onPlay={() => sp.playTracks(list.map(x => x.uri), i)} />
          ))}
        </div>
      )}
    </>
  );
}
