/**
 * Designsystem „Nocturne" — die einzige Quelle für Farben, Typografie und
 * Abstände (`docs/regeln.md`, Farb- und Maßliterale). Zwei Paletten mit
 * identischen Schlüsseln; Typografie, Radien und Abstände sind modusunabhängig.
 */

import type { TextStyle } from 'react-native';

const palette = {
  dark: {
    bg: '#161826',
    surface: '#232532',
    text: '#e9e9ed',
    textMuted: '#9397ab',
    divider: 'rgba(233,233,237,0.16)',
    accent: '#9184d9',
    accent300: '#d2cefd',
    accent700: '#5d5294',
    accentWash: 'rgba(145,132,217,0.22)',
    neutral300: '#cfd3e5',
    neutral400: '#b2b6ca',
    neutral600: '#75798c',
    neutral800: '#3f424d',
    inputBg: '#1d1f2c',
    cameraBg: '#0f1018',
  },
  light: {
    bg: '#f4f4f7',
    surface: '#ffffff',
    text: '#1b1c24',
    textMuted: '#75798c',
    divider: 'rgba(27,28,36,0.16)',
    accent: '#6b5cc4',
    accent300: '#b9b1ea',
    accent700: '#5d5294',
    accentWash: 'rgba(107,92,196,0.14)',
    neutral300: '#cfd3e5',
    neutral400: '#b2b6ca',
    neutral600: '#75798c',
    neutral800: '#3f424d',
    inputBg: '#ffffff',
    cameraBg: '#0f1018',
  },
} as const;

export type ThemeMode = keyof typeof palette;
export type Palette = (typeof palette)[ThemeMode];

const shared = {
  radius: { sm: 4, md: 8, lg: 14 },
  space: { 1: 2.8, 2: 5.6, 3: 8.4, 4: 11.2, 6: 16.8, 8: 22.4 },
  /** Seitenrand aller Screens */
  gutter: 20,
  /** Mindestgröße für Tippziele */
  hit: 44,
  font: {
    family: 'Inter',
    // Größen sind fix, nicht skalieren: Zahlen müssen in Tabellen bündig bleiben.
    display: { fontFamily: 'Inter_600SemiBold', fontSize: 40 },
    title: { fontFamily: 'Inter_600SemiBold', fontSize: 22 },
    body: { fontFamily: 'Inter_400Regular', fontSize: 14 },
    label: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase' as const },
    micro: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  },
  /** Überall dort setzen, wo Zahlen untereinander stehen. */
  tabular: { fontVariant: ['tabular-nums'] } as TextStyle,
} as const;

export const themes = {
  dark: { mode: 'dark' as ThemeMode, color: palette.dark as Palette, ...shared },
  light: { mode: 'light' as ThemeMode, color: palette.light as Palette, ...shared },
} as const;

export type Theme = (typeof themes)['dark'];

/** Standardmodus beim ersten Start. */
export const defaultMode: ThemeMode = 'dark';
