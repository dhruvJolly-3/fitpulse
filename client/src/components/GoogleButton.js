import React, { useEffect, useRef, useState } from 'react';

// "Continue with Google" via Google Identity Services.
// Only renders when REACT_APP_GOOGLE_CLIENT_ID is set at build time (it must
// match the server's GOOGLE_CLIENT_ID). Calls onCredential(idToken) on success.
const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

// Load the GIS script once and share the promise between mounts.
let scriptPromise;
const loadScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT_SRC;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => { scriptPromise = null; reject(new Error('Could not load Google sign-in')); };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
};

export default function GoogleButton({ onCredential, onError, text = 'continue_with' }) {
  const slot = useRef(null);
  const [failed, setFailed] = useState(false);

  // Keep the latest callbacks without re-initialising Google on every render.
  const handlers = useRef({ onCredential, onError });
  handlers.current = { onCredential, onError };

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !slot.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (resp) => handlers.current.onCredential(resp.credential),
      });
      window.google.accounts.id.renderButton(slot.current, {
        theme: 'outline', size: 'large', shape: 'pill', text,
        width: Math.min(slot.current.offsetWidth || 400, 400),
      });
    }).catch(err => { if (!cancelled) { setFailed(true); handlers.current.onError?.(err.message); } });
    return () => { cancelled = true; };
  }, [text]);

  if (!CLIENT_ID || failed) return null;
  return (
    <>
      <div className="divider">or</div>
      <div ref={slot} className="google-slot" />
    </>
  );
}
