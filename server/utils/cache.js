// Tiny in-memory TTL cache for third-party API responses (recipes, videos).
// Keeps us well inside free-tier quotas; it resets whenever the server restarts.
const store = new Map();
const MAX_ENTRIES = 500;

const get = (key) => {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) { store.delete(key); return undefined; }
  return hit.value;
};

const set = (key, value, ttlMs) => {
  if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value); // drop oldest
  store.set(key, { value, expires: Date.now() + ttlMs });
};

module.exports = { get, set };
