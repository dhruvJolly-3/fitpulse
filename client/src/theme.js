// Colour values for places CSS variables can't reach (Recharts SVG props).
// Keep in sync with the tokens at the top of index.css.
export const COLORS = {
  ink: '#0e0e10',
  ink50: 'rgba(14,14,16,0.50)',
  ink15: 'rgba(14,14,16,0.12)',
  line: 'rgba(14,14,16,0.10)',
  paper: '#fffdf7',
  cream: '#f1ebde',
  matcha: '#c9e265',
  matcha2: '#b8d250',
  coral: '#ff5b3d',
};

// Same palette for dark mode (mirrors :root[data-theme="dark"] in index.css)
export const DARK_COLORS = {
  ...COLORS,
  ink: '#ece6d8',
  ink50: 'rgba(236,230,216,0.55)',
  ink15: 'rgba(236,230,216,0.16)',
  line: 'rgba(236,230,216,0.10)',
  paper: '#17171a',
  cream: '#101012',
};

export const colorsFor = (resolved) => (resolved === 'dark' ? DARK_COLORS : COLORS);
