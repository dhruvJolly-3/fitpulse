const router = require('express').Router();
const { query } = require('express-validator');
const auth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const cache = require('../utils/cache');

// Exercise demo videos and music search via the YouTube Data API v3.
// Needs YOUTUBE_API_KEY (Google Cloud Console → enable "YouTube Data API v3"
// → Credentials → API key). Each search costs 100 of the 10,000 free daily
// quota units, so results are cached for 24h per query.
// Without a key this responds 503 and the client falls back to opening a
// YouTube search in a new tab.
const TTL = 24 * 60 * 60 * 1000;

// One YouTube search, cached per query. `music` restricts results to the
// Music category (id 10) for the in-app music player. videoSyndicated=true
// skips videos whose owners block playback outside youtube.com.
const youtubeSearch = async (q, { music = false, max = 6 } = {}) => {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    const err = new Error('YouTube is not configured on the server (YOUTUBE_API_KEY)');
    err.status = 503;
    throw err;
  }
  const cacheKey = `yt:${music ? 'm' : 'v'}:${max}:${q.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    part: 'snippet', type: 'video', videoEmbeddable: 'true', videoSyndicated: 'true',
    safeSearch: 'strict', maxResults: String(max), q, key,
  });
  if (music) params.set('videoCategoryId', '10');
  const r = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (!r.ok) {
    const err = new Error('YouTube is unavailable right now');
    err.status = 502;
    throw err;
  }
  const data = await r.json();
  const items = (data.items || []).map(v => ({
    id: v.id.videoId,
    title: v.snippet.title,
    channel: v.snippet.channelTitle,
    thumbnail: v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.default?.url,
  }));
  cache.set(cacheKey, items, TTL);
  return items;
};

// GET /api/videos/search?q=barbell squat → exercise demos
router.get('/search', auth, validate([
  query('q').trim().isLength({ min: 2, max: 80 }).withMessage('Search must be 2–80 characters'),
]), asyncHandler(async (req, res) => {
  res.json(await youtubeSearch(`${req.query.q} exercise form tutorial`));
}));

// GET /api/videos/music?q=gym motivation → songs for the in-app music player
router.get('/music', auth, validate([
  query('q').trim().isLength({ min: 2, max: 80 }).withMessage('Search must be 2–80 characters'),
]), asyncHandler(async (req, res) => {
  res.json(await youtubeSearch(req.query.q, { music: true, max: 15 }));
}));

module.exports = router;
