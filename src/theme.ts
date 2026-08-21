/**
 * The "Nocturne" design system — the only source for colours, typography and
 * spacing (`docs/regeln.md`, Farb- und Maßliterale). Two palettes with
 * identical keys; typography, radii and spacing do not depend on the mode.
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
  /** Side margin of every screen */
  gutter: 20,
  /** Minimum size of a tap target */
  hit: 44,
  font: {
    family: 'Inter',
    // Sizes are fixed and must not scale: numbers have to stay flush in tables.
    display: { fontFamily: 'Inter_600SemiBold', fontSize: 40 },
    title: { fontFamily: 'Inter_600SemiBold', fontSize: 22 },
    body: { fontFamily: 'Inter_400Regular', fontSize: 14 },
    label: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase' as const },
    micro: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  },
  /** Set wherever numbers stand below one another. */
  tabular: { fontVariant: ['tabular-nums'] } as TextStyle,
} as const;

export const themes = {
  dark: { mode: 'dark' as ThemeMode, color: palette.dark as Palette, ...shared },
  light: { mode: 'light' as ThemeMode, color: palette.light as Palette, ...shared },
} as const;

export type Theme = (typeof themes)['dark'];

/** Default mode on first start. */
export const defaultMode: ThemeMode = 'dark';
