import React, { useState } from 'react';

// Workout music: paste a Spotify or YouTube / YouTube Music link and it plays
// in an official embed. No API keys or login needed — the embeds handle
// playback (Spotify plays 30s previews unless you're logged in to Spotify in
// this browser). The link is remembered per browser in localStorage.
const STORAGE_KEY = 'fp_music_url';

// Convert a pasted share link into an embeddable URL, or null if unsupported.
export const toEmbed = (raw) => {
  let url;
  try { url = new URL(raw.trim()); } catch { return null; }
  const host = url.hostname.replace(/^www\./, '');

  // open.spotify.com/{playlist|album|track|artist|show|episode}/{id}
  if (host === 'open.spotify.com') {
    const m = url.pathname.match(/(?:\/intl-[a-z-]+)?\/(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]+)/);
    return m ? { kind: 'spotify', src: `https://open.spotify.com/embed/${m[1]}/${m[2]}?theme=0`, height: m[1] === 'track' ? 152 : 352 } : null;
  }

  // YouTube and YouTube Music share the same video / playlist IDs
  if (['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(host)) {
    const list = url.searchParams.get('list');
    const video = host === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v');
    if (list) return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(list)}`, height: 240 };
    if (video) return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video)}`, height: 240 };
  }
  return null;
};

// localStorage can throw (private mode, blocked storage) — never let that break the page
const readSaved = () => { try { return localStorage.getItem(STORAGE_KEY) || ''; } catch { return ''; } };
const writeSaved = (v) => { try { v ? localStorage.setItem(STORAGE_KEY, v) : localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } };

export default function MusicPlayer() {
  const [saved, setSaved] = useState(readSaved);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const embed = saved ? toEmbed(saved) : null;

  const connect = (e) => {
    e.preventDefault();
    if (!toEmbed(input)) return setError('Paste a Spotify, YouTube or YouTube Music link');
    setError(''); setSaved(input.trim()); writeSaved(input.trim()); setInput('');
  };

  const disconnect = () => { setSaved(''); writeSaved(''); };

  return (
    <div className="card">
      <div className="card-h">
        <h3>Workout <span className="serif-it">music</span></h3>
        {embed && <button className="btn ghost sm" onClick={disconnect}>Change</button>}
      </div>

      {embed ? (
        <iframe className="music-embed" src={embed.src} height={embed.height} title="Music player" loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />
      ) : (
        <form onSubmit={connect}>
          <p style={{ fontSize: 13, color: 'var(--ink-50)', marginBottom: 12, lineHeight: 1.5 }}>
            Paste a playlist, album or track link from Spotify, YouTube or YouTube Music.
          </p>
          <div className="field" style={{ marginBottom: 10 }}>
            <input placeholder="https://open.spotify.com/playlist/…" value={input} onChange={e => setInput(e.target.value)} />
          </div>
          {error && <div className="alert">{error}</div>}
          <button type="submit" className="btn primary sm" disabled={!input.trim()}>Connect</button>
        </form>
      )}
    </div>
  );
}
