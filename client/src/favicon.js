// Animated favicon: the FitPulse heartbeat line, drawn on a canvas and
// swapped into <link rel="icon"> frame by frame (browsers don't animate
// favicons on their own).
//   login   → the pulse line draws itself in, then a double beat
//   logout  → the line flattens and fades out
//   active  → a soft heartbeat every few seconds while the app is open
// Only runs while the tab is visible, and stays static if the user prefers
// reduced motion.
const SIZE = 64;
const INK = '#0e0e10', LIME = '#c9e265', CORAL = '#ff5b3d';
// Heartbeat path points (0–1 space), same shape as the app icon
const PATH = [[0.18, 0.52], [0.36, 0.52], [0.44, 0.33], [0.55, 0.72], [0.63, 0.5], [0.82, 0.5]];

let canvas, ctx, link, raf, beatTimer;
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const setup = () => {
  if (canvas) return true;
  link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  ctx = canvas.getContext('2d');
  return Boolean(ctx);
};

// progress: how much of the line is drawn (0–1); amp: beat height; alpha: fade
const draw = ({ progress = 1, amp = 1, alpha = 1, dot = false } = {}) => {
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = LIME;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(2, 2, SIZE - 4, SIZE - 4, 16) : ctx.rect(2, 2, SIZE - 4, SIZE - 4);
  ctx.fill();

  // Scale the peaks around the baseline by `amp`
  const pts = PATH.map(([x, y]) => [x * SIZE, (0.51 + (y - 0.51) * amp) * SIZE]);
  const segs = pts.length - 1;
  const upto = progress * segs;
  ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(...pts[0]);
  let end = pts[0];
  for (let i = 1; i <= segs; i++) {
    if (i <= upto) { ctx.lineTo(...pts[i]); end = pts[i]; }
    else {
      const t = upto - (i - 1);
      if (t > 0) { end = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]; ctx.lineTo(...end); }
      break;
    }
  }
  ctx.stroke();
  if (dot) { ctx.fillStyle = CORAL; ctx.beginPath(); ctx.arc(end[0], end[1], 5, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  link.href = canvas.toDataURL('image/png');
};

// Run a timed animation; frame(t) gets 0→1
const animate = (ms, frame) => new Promise(resolve => {
  cancelAnimationFrame(raf);
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / ms);
    frame(t);
    if (t < 1) raf = requestAnimationFrame(step); else resolve();
  };
  raf = requestAnimationFrame(step);
});

const easeOut = t => 1 - Math.pow(1 - t, 3);
// Two quick beats: amplitude pops above 1 and settles
const beat = (t) => 1 + 0.35 * Math.sin(Math.PI * Math.min(1, t * 2)) * (t < 0.5 ? 1 : 0) + 0.2 * Math.sin(Math.PI * Math.max(0, t * 2 - 1));

export const faviconLogin = async () => {
  if (!setup()) return;
  if (reduced()) return draw();
  await animate(900, t => draw({ progress: easeOut(t), dot: t < 1 }));
  await animate(700, t => draw({ amp: beat(t) }));
};

export const faviconLogout = async () => {
  if (!setup()) return;
  if (reduced()) return draw({ amp: 0 });
  await animate(700, t => draw({ amp: 1 - easeOut(t), alpha: 1 - 0.5 * t }));
  draw({ amp: 0, alpha: 0.5 });
};

// Gentle heartbeat every 4s while the app is open; returns a stop function
export const faviconHeartbeat = () => {
  if (!setup() || reduced()) return () => {};
  clearInterval(beatTimer);
  beatTimer = setInterval(() => {
    if (document.visibilityState === 'visible') animate(600, t => draw({ amp: beat(t) }));
  }, 4000);
  return () => clearInterval(beatTimer);
};
