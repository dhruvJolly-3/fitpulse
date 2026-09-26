import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { finishSpotifyLogin } from '../music/spotifyAuth';

// Spotify redirects here after login (/spotify-callback?code=...).
// Swap the code for tokens, then return to the page the user came from.
export default function SpotifyCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const done = useRef(false); // StrictMode runs effects twice; the code is single-use

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    finishSpotifyLogin(window.location.search)
      .then(back => navigate(back, { replace: true }))
      .catch(err => setError(err.message));
  }, [navigate]);

  return (
    <div className="center-screen">
      <div className="brand-mark">F</div>
      {error ? (
        <>
          <div className="alert" style={{ maxWidth: 360 }}>{error}</div>
          <Link to="/training" className="btn primary">Back to FitPulse</Link>
        </>
      ) : <span className="label">Connecting Spotify…</span>}
    </div>
  );
}
