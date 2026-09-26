// Spotify login using OAuth 2.0 Authorization Code + PKCE, entirely in the
// browser (no client secret needed). Tokens are kept in localStorage per
// browser and refreshed automatically.
//
// Setup: developer.spotify.com/dashboard → Create app → tick "Web API" and
// "Web Playback SDK" → add Redirect URIs:
//   https://<your-site>/spotify-callback
//   http://127.0.0.1:3000/spotify-callback   (Spotify doesn't accept "localhost")
// Then set REACT_APP_SPOTIFY_CLIENT_ID on Vercel / in client/.env.local.
export const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
export const isSpotifyConfigured = () => Boolean(CLIENT_ID);

const SCOPES = [
  'streaming',                      // Web Playback SDK (play inside the app)
  'user-read-email', 'user-read-private',
  'user-read-playback-state', 'user-modify-playback-state', 'user-read-currently-playing',
  'playlist-read-private', 'playlist-read-collaborative',
  'user-library-read',              // Liked Songs
].join(' ');

const TOKEN_KEY = 'fp_spotify';
const VERIFIER_KEY = 'fp_spotify_verifier';
const RETURN_KEY = 'fp_spotify_return';
const redirectUri = () => `${window.location.origin}/spotify-callback`;

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

const base64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Step 1: send the user to Spotify's login/consent page
export async function startSpotifyLogin() {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(64)));
  const challenge = base64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  store.set(VERIFIER_KEY, verifier);
  store.set(RETURN_KEY, window.location.pathname); // come back to the same page
  const params = new URLSearchParams({
    client_id: CLIENT_ID, response_type: 'code', redirect_uri: redirectUri(),
    code_challenge_method: 'S256', code_challenge: challenge, scope: SCOPES,
  });
  window.location.assign(`https://accounts.spotify.com/authorize?${params}`);
}

const saveTokens = (data, previousRefresh) => {
  const tokens = {
    access: data.access_token,
    refresh: data.refresh_token || previousRefresh, // Spotify may omit it on refresh
    expires: Date.now() + (data.expires_in - 60) * 1000, // refresh a minute early
  };
  store.set(TOKEN_KEY, JSON.stringify(tokens));
  return tokens;
};

const tokenRequest = async (body) => {
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, ...body }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error_description || 'Spotify login failed');
  return data;
};

// Step 2: on /spotify-callback, swap the ?code for tokens. Returns the page to go back to.
export async function finishSpotifyLogin(search) {
  const params = new URLSearchParams(search);
  if (params.get('error')) throw new Error(params.get('error') === 'access_denied' ? 'Spotify login was cancelled' : params.get('error'));
  const verifier = store.get(VERIFIER_KEY);
  if (!params.get('code') || !verifier) throw new Error('Spotify login expired — please try again');
  const data = await tokenRequest({
    grant_type: 'authorization_code', code: params.get('code'),
    redirect_uri: redirectUri(), code_verifier: verifier,
  });
  saveTokens(data);
  store.del(VERIFIER_KEY);
  const back = store.get(RETURN_KEY) || '/training';
  store.del(RETURN_KEY);
  return back;
}

export const isSpotifyConnected = () => Boolean(store.get(TOKEN_KEY));
export const disconnectSpotify = () => store.del(TOKEN_KEY);

// A valid access token, refreshing it if needed (null when not connected)
let refreshing;
export async function getSpotifyToken() {
  const raw = store.get(TOKEN_KEY);
  if (!raw) return null;
  const tokens = JSON.parse(raw);
  if (Date.now() < tokens.expires) return tokens.access;
  if (!refreshing) {
    refreshing = tokenRequest({ grant_type: 'refresh_token', refresh_token: tokens.refresh })
      .then(data => saveTokens(data, tokens.refresh).access)
      .catch(err => { disconnectSpotify(); throw err; })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

// Small Web API helper. Returns parsed JSON, or null for 204 responses.
export async function spotifyApi(path, { method = 'GET', body, query } = {}) {
  const token = await getSpotifyToken();
  if (!token) throw new Error('Connect Spotify first');
  const qs = query ? `?${new URLSearchParams(query)}` : '';
  const r = await fetch(`https://api.spotify.com/v1${path}${qs}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 204 || r.status === 202) return null;
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    const reason = data?.error?.reason;
    const err = new Error(
      reason === 'PREMIUM_REQUIRED' ? 'Spotify Premium is needed to control playback'
      : reason === 'NO_ACTIVE_DEVICE' ? 'No Spotify device found — open Spotify on your phone or computer, then try again'
      : data?.error?.message || `Spotify error ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return data;
}
