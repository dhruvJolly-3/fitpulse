// Tiny event bus so only one music source plays at a time: when YouTube
// starts, Spotify pauses, and vice versa.
const EVENT = 'fp:music-source';

export const announceSource = (source) =>
  window.dispatchEvent(new CustomEvent(EVENT, { detail: source }));

// Calls `cb` whenever a source other than `mine` starts. Returns an unsubscribe.
export const onOtherSource = (mine, cb) => {
  const handler = (e) => { if (e.detail !== mine) cb(); };
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
};
