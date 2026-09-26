const router = require('express').Router();
const { query } = require('express-validator');
const auth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const cache = require('../utils/cache');

// Exercise demo videos via the YouTube Data API v3.
// Needs YOUTUBE_API_KEY (Google Cloud Console → enable "YouTube Data API v3"
// → Credentials → API key). Each search costs 100 of the 10,000 free daily
// quota units, so results are cached for 24h per query.
// Without a key this responds 503 and the client falls back to opening a
// YouTube search in a new tab.
const TTL = 24 * 60 * 60 * 1000;

// GET /api/videos/search?q=barbell squat
router.get('/search', auth, validate([
  query('q').trim().isLength({ min: 2, max: 80 }).withMessage('Search must be 2–80 characters'),
]), asyncHandler(async (req, res) => {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return res.status(503).json({ message: 'Workout videos are not configured on the server' });

  const q = `${req.query.q} exercise form tutorial`;
  const cacheKey = `yt:${q.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  const params = new URLSearchParams({
    part: 'snippet', type: 'video', videoEmbeddable: 'true', safeSearch: 'strict',
    maxResults: '6', q, key,
  });
  const r = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (!r.ok) {
    const err = new Error('Video service is unavailable right now');
    err.status = 502;
    throw err;
  }
  const data = await r.json();
  const videos = (data.items || []).map(v => ({
    id: v.id.videoId,
    title: v.snippet.title,
    channel: v.snippet.channelTitle,
    thumbnail: v.snippet.thumbnails?.medium?.url,
  }));
  cache.set(cacheKey, videos, TTL);
  res.json(videos);
}));

module.exports = router;
