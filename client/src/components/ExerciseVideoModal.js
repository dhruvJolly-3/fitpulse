import React, { useEffect, useState } from 'react';
import { api } from '../context/AuthContext';

// Demo videos for one exercise. Asks our server (YouTube Data API); when the
// server has no YOUTUBE_API_KEY it answers 503 and we offer a plain YouTube
// search link instead, so the button is always useful.
const youtubeSearchUrl = (name) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} exercise form tutorial`)}`;

export default function ExerciseVideoModal({ exercise, onClose }) {
  const [videos, setVideos] = useState(null); // null = loading
  const [active, setActive] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get('/videos/search', { params: { q: exercise } })
      .then(r => { if (!cancelled) { setVideos(r.data); setActive(r.data[0]?.id || null); } })
      .catch(err => { if (!cancelled) { setVideos([]); setError(err.response?.data?.message || 'Could not load videos'); } });
    return () => { cancelled = true; };
  }, [exercise]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-head">
          <div className="modal-title">{exercise} <span className="serif-it">demo</span></div>
          <button className="icon-btn" onClick={onClose} title="Close">✕</button>
        </div>

        {videos === null && <div className="skeleton" style={{ aspectRatio: '16 / 9' }} />}

        {active && (
          <div className="video-frame">
            {/* youtube-nocookie = privacy-enhanced embed (no tracking cookies until play) */}
            <iframe src={`https://www.youtube-nocookie.com/embed/${active}?rel=0&playsinline=1&modestbranding=1`} title={exercise}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        )}

        {videos?.length > 1 && (
          <div className="video-list">
            {videos.map(v => (
              <button key={v.id} className={`video-item ${v.id === active ? 'on' : ''}`} onClick={() => setActive(v.id)}>
                <img src={v.thumbnail} alt="" loading="lazy" />
                <div>
                  <div className="vt">{v.title}</div>
                  <span className="label">{v.channel}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {videos !== null && videos.length === 0 && (
          <>
            {error && <div className="notice">{error}</div>}
            <a className="btn primary block" href={youtubeSearchUrl(exercise)} target="_blank" rel="noopener noreferrer">
              Search “{exercise}” on YouTube ↗
            </a>
          </>
        )}
      </div>
    </div>
  );
}
