// Source de verite : website/frontend/shared/styles/theme.css
// Les composants utilisent les ROLES (Theme), jamais les brand bruts.

export const brand = {
  50: '#ecfdf4',
  100: '#d1fae4',
  200: '#a6f2cc',
  300: '#6ee7ae',
  400: '#3fdc94',
  500: '#1fc27b',
  600: '#14a467',
  700: '#0f8053',
  800: '#0f5e3f',
  900: '#0c3d2a',
  950: '#052117',
} as const;

export const stone = {
  0: '#ffffff',
  25: '#fafaf9',
  50: '#f4f4f3',
  100: '#ededeb',
  200: '#e7e7e5',
  300: '#d2d2ce',
  400: '#a8a8a3',
  500: '#7a7a73',
  600: '#57574f',
  950: '#111110',
} as const;

export const DISCORD_COLOR = '#5865f2';

export type ThemeName = 'dark' | 'light';
export type ThemePreference = 'dark' | 'light' | 'auto';
export type ToneName = 'success' | 'info' | 'warn' | 'danger' | 'neutral';

export interface Tone {
  dot: string;
  bg: string;
  fg: string;
}

export interface Theme {
  name: ThemeName;
  isDark: boolean;
  canvas: string;
  surface: string;
  raised: string;
  sunken: string;
  line: string;
  lineStrong: string;
  fg: string;
  fgMuted: string;
  fgSubtle: string;
  fgInverse: string;
  accent: string;
  accentHover: string;
  accentFg: string;
  accentSoft: string;
  /** Fond de pression d'une rangee. */
  pressed: string;
  /** Fond du bouton secondary (fg a 3 %). */
  secondaryBg: string;
  danger: string;
  tones: Record<ToneName, Tone>;
  logoTile: string;
}

export const darkTheme: Theme = {
  name: 'dark',
  isDark: true,
  canvas: '#09090b',
  surface: '#111114',
  raised: '#17171b',
  sunken: '#0c0c0e',
  line: 'rgba(255,255,255,0.07)',
  lineStrong: 'rgba(255,255,255,0.13)',
  fg: '#f4f4f5',
  fgMuted: '#a1a1aa',
  fgSubtle: '#80808a',
  fgInverse: '#09090b',
  accent: brand[400],
  accentHover: brand[300],
  accentFg: brand[950],
  accentSoft: 'rgba(63,220,148,0.10)',
  pressed: 'rgba(255,255,255,0.04)',
  secondaryBg: 'rgba(244,244,245,0.03)',
  danger: '#e0736a',
  logoTile: brand[800],
  tones: {
    success: { dot: brand[400], bg: 'rgba(63,220,148,0.10)', fg: brand[400] },
    info: { dot: '#6d9eef', bg: '#14203a', fg: '#a9c6f7' },
    warn: { dot: '#e0913c', bg: '#2c2013', fg: '#eec18a' },
    danger: { dot: '#e0736a', bg: '#2e1715', fg: '#f0a9a2' },
    neutral: { dot: '#80808a', bg: 'rgba(255,255,255,0.05)', fg: '#a1a1aa' },
  },
};

// Les fonds/textes "soft" du clair (info, warn, danger, neutral) ne sont pas
// dans le cahier : derives des etats sourds (#175cd3, #b45309, #b42318).
export const lightTheme: Theme = {
  name: 'light',
  isDark: false,
  canvas: stone[25],
  surface: stone[0],
  raised: stone[0],
  sunken: stone[50],
  line: stone[200],
  lineStrong: stone[300],
  fg: stone[950],
  fgMuted: stone[600],
  fgSubtle: stone[600],
  fgInverse: stone[0],
  accent: brand[700],
  accentHover: brand[800],
  accentFg: stone[0],
  accentSoft: brand[50],
  pressed: 'rgba(17,17,16,0.04)',
  secondaryBg: 'rgba(17,17,16,0.03)',
  danger: '#b42318',
  logoTile: brand[950],
  tones: {
    success: { dot: brand[700], bg: brand[50], fg: brand[700] },
    info: { dot: '#175cd3', bg: '#eff4ff', fg: '#175cd3' },
    warn: { dot: '#b45309', bg: '#fef6ea', fg: '#b45309' },
    danger: { dot: '#b42318', bg: '#fef3f2', fg: '#b42318' },
    neutral: { dot: stone[600], bg: stone[50], fg: stone[600] },
  },
};

export const radius = { control: 10, card: 12, tile: 16, pill: 999 } as const;
export const space = { screenX: 16, gap: 12 } as const;
export const size = {
  tabBar: 56,
  buttonMd: 36,
  buttonLg: 44,
  buttonXl: 48,
  touch: 44,
  field: 44,
  topBar: 56,
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
} as const;

/** Tailles de la charte (3.2). */
export const fontSize = {
  tab: 11,
  meta: 12,
  secondary: 13,
  body: 14,
  button: 16,
  section: 20,
  title: 24,
  kpi: 30,
} as const;

export const ANIM_MS = 150;
