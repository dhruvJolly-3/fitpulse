// Small in-memory rate limiter for the auth endpoints (no extra dependency).
// Blocks password guessing and email spam: once a key goes over `max`
// requests inside `windowMs`, further requests get 429 until the window
// resets. State lives in memory, so it resets on a server restart; that's
// fine for a single Render instance.
//
//   const limit = rateLimit({ windowMs: 15 * 60e3, max: 10, key: req => req.ip });
//   router.post('/login', limit, handler)
const rateLimit = ({ windowMs, max, key, message = 'Too many attempts. Please wait a few minutes and try again.' }) => {
  const hits = new Map(); // key -> { count, resetAt }

  // Drop expired entries now and then so memory can't grow without bound
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }, windowMs);
  sweep.unref?.();

  const middleware = (req, res, next) => {
    const k = key(req);
    const now = Date.now();
    let entry = hits.get(k);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(k, entry);
    }
    entry.count += 1;
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ message });
    }
    next();
  };
  // Lets a route forgive a key, e.g. clear failed logins after a success
  middleware.reset = (req) => hits.delete(key(req));
  return middleware;
};

// Normalised email from the body, so "A@x.com " and "a@x.com" share a bucket
const emailOf = (req) => String(req.body?.email || '').trim().toLowerCase();

module.exports = { rateLimit, emailOf };
