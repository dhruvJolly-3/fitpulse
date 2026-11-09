import { useColorScheme } from 'react-native';

// Same palette as the web app (client/src/index.css): cream paper, ink,
// matcha (success / targets met) and coral (today / warnings).
const light = {
  bg: '#f1ebde',
  card: '#fffdf7',
  bone: '#e8e1d2',
  ink: '#0e0e10',
  ink70: 'rgba(14,14,16,0.70)',
  ink50: 'rgba(14,14,16,0.50)',
  ink15: 'rgba(14,14,16,0.12)',
  line: 'rgba(14,14,16,0.10)',
  matcha: '#c9e265',
  matcha2: '#b8d250',
  coral: '#ff5b3d',
  obsidian: '#0e0e10',
  onDark: '#f1ebde',
  danger: '#e5484d',
};

const dark: typeof light = {
  ...light,
  bg: '#101012',
  card: '#17171a',
  bone: '#222226',
  ink: '#ece6d8',
  ink70: 'rgba(236,230,216,0.72)',
  ink50: 'rgba(236,230,216,0.55)',
  ink15: 'rgba(236,230,216,0.16)',
  line: 'rgba(236,230,216,0.10)',
  obsidian: '#0a0a0b',
};

export type Colors = typeof light;

export const useColors = (): Colors => (useColorScheme() === 'dark' ? dark : light);

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };
export const space = (n: number) => n * 4;
