// "Connect YouTube" — read the user's own YouTube / YouTube Music playlists.
// YouTube Music has no public API, but playlists saved to your Google
// account are available through the YouTube Data API. We get a short-lived,
// read-only access token with Google Identity Services (same OAuth client as
// Google sign-in: REACT_APP_GOOGLE_CLIENT_ID) and play the songs in the
// in-app YouTube player.
// Google Cloud Console: enable "YouTube Data API v3" and add the
// youtube.readonly scope to the OAuth consent screen.
const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';
let token = null; // { value, expires } — memory only, re-requested after reload

export const isYouTubeAccountConfigured = () => Boolean(CLIENT_ID);
export const isYouTubeConnected = () => Boolean(token && Date.now() < token.expires);
export const disconnectYouTube = () => {
  if (token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(token.value, () => {});
  token = null;
};

let gisPromise;
const loadGis = () => {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = resolve;
      s.onerror = () => { gisPromise = null; reject(new Error('Could not load Google sign-in')); };
      document.head.appendChild(s);
    });
  }
  return gisPromise;
};

// Opens Google's consent popup (must be called from a click)
export const connectYouTube = () => loadGis().then(() => new Promise((resolve, reject) => {
  const client = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: (resp) => {
      if (resp.error) return reject(new Error(resp.error_description || 'YouTube connection was cancelled'));
      token = { value: resp.access_token, expires: Date.now() + (resp.expires_in - 60) * 1000 };
      resolve();
    },
    error_callback: (e) => reject(new Error(e?.message || 'YouTube connection was cancelled')),
  });
  client.requestAccessToken();
}));

const yt = async (path, params) => {
  if (!isYouTubeConnected()) throw new Error('Connect YouTube first');
  const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${token.value}` },
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || 'YouTube request failed');
  return data;
};

// Your playlists (first 50)
export const myPlaylists = async () => {
  const data = await yt('playlists', { part: 'snippet,contentDetails', mine: 'true', maxResults: '50' });
  return (data.items || []).map(p => ({
    id: p.id, name: p.snippet.title, count: p.contentDetails?.itemCount,
    image: p.snippet.thumbnails?.medium?.url || p.snippet.thumbnails?.default?.url,
  }));
};

// Tracks in a playlist, in the shape the YouTube player queue uses
export const playlistTracks = async (playlistId) => {
  const data = await yt('playlistItems', { part: 'snippet', playlistId, maxResults: '50' });
  return (data.items || [])
    .filter(i => i.snippet?.resourceId?.videoId && i.snippet.title !== 'Private video' && i.snippet.title !== 'Deleted video')
    .map(i => ({
      id: i.snippet.resourceId.videoId,
      title: i.snippet.title,
      channel: i.snippet.videoOwnerChannelTitle || '',
      thumbnail: i.snippet.thumbnails?.medium?.url || i.snippet.thumbnails?.default?.url,
    }));
};
