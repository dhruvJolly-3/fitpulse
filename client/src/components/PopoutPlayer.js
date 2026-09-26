import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// "Pop out" player: a small always-on-top window with play/pause, mute,
// previous/next, so music can be controlled while you're in another app.
// Uses the Document Picture-in-Picture API (Chrome / Edge 116+ on desktop).
// Other browsers simply don't show the pop-out button.
export const canPopOut = () => typeof window !== 'undefined' && 'documentPictureInPicture' in window;

// Copy the app's stylesheets (incl. Google Fonts) into the PiP window so it
// looks like FitPulse
const copyStyles = (target) => {
  [...document.styleSheets].forEach((sheet) => {
    try {
      const css = [...sheet.cssRules].map(r => r.cssText).join('\n');
      const style = target.document.createElement('style');
      style.textContent = css;
      target.document.head.appendChild(style);
    } catch {
      // Cross-origin sheets (fonts) can't be read; link them instead
      if (sheet.href) {
        const link = target.document.createElement('link');
        link.rel = 'stylesheet';
        link.href = sheet.href;
        target.document.head.appendChild(link);
      }
    }
  });
};

export function usePopout() {
  const [pipWindow, setPipWindow] = useState(null);

  const open = useCallback(async () => {
    if (!canPopOut()) return;
    const win = await window.documentPictureInPicture.requestWindow({ width: 360, height: 150 });
    copyStyles(win);
    win.document.body.className = 'pip-body';
    win.addEventListener('pagehide', () => setPipWindow(null)); // user closed it
    setPipWindow(win);
  }, []);

  const close = useCallback(() => { pipWindow?.close(); setPipWindow(null); }, [pipWindow]);

  // Close the pop-out when the player itself goes away
  useEffect(() => () => pipWindow?.close(), [pipWindow]);

  return { pipWindow, open, close };
}

// The controls rendered inside the pop-out window
export function PopoutControls({ win, m }) {
  if (!win) return null;
  return createPortal(
    <div className="pip-player">
      {m.current.thumbnail ? <img src={m.current.thumbnail} alt="" /> : <span className="pip-art" />}
      <div className="pip-info">
        <div className="pip-title" title={m.current.title}>{m.current.title}</div>
        <div className="pip-sub">{m.current.channel}</div>
        <div className="pip-btns">
          <button onClick={m.prev} title="Previous" aria-label="Previous">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>
          </button>
          <button className="pip-play" onClick={m.toggle} title={m.playing ? 'Pause' : 'Play'} aria-label={m.playing ? 'Pause' : 'Play'}>
            {m.playing
              ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>
              : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z"/></svg>}
          </button>
          <button onClick={m.next} title="Next" aria-label="Next">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>
          </button>
          <button onClick={m.toggleMute} title={m.muted ? 'Unmute' : 'Mute'} aria-label={m.muted ? 'Unmute' : 'Mute'} className={m.muted ? 'on' : ''}>
            {m.muted
              ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m23 9-6 6M17 9l6 6"/></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>}
          </button>
        </div>
      </div>
    </div>,
    win.document.body
  );
}
