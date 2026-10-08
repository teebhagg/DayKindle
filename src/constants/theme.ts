import '@/global.css';

import { Platform } from 'react-native';

// Semantic colors shared by every screen and both appearance styles.
export const Colors = {
  light: {
    text: '#24332D', background: '#F7F8F5', backgroundElement: '#FFFFFF',
    backgroundSelected: '#E4EEE5', textSecondary: '#526359',
    paper: '#F7F8F5', surface: '#FFFFFF', ink: '#24332D', muted: '#526359',
    green: '#356348', lightGreen: '#E4EEE5', line: '#D9DFD9', controlBorder: '#758579',
    onAccent: '#FFFFFF', onInk: '#FFFFFF', pressed: '#D6E5D9', actionPressed: '#294F39',
    disabled: '#E1E5E0', disabledText: '#526359',
    error: '#A43732', errorBackground: '#FBECE9',
    warmSurface: '#FAF1DE', warmAccent: '#79551E',
    warning: '#80581C', warningBackground: '#FAF0D9',
    success: '#356348', successBackground: '#E4EEE5',
    info: '#355E80', infoBackground: '#E8EFF5',
    chart: '#356348', chartSecondary: '#758579', chartTrack: '#D9DFD9',
    clay: '#526359', white: '#FFFFFF',
    scrim: 'rgba(12,24,17,0.42)', shadow: '#17231D',
    hero: '#356348', heroText: '#FFFFFF', heroMuted: '#E4EEE5',
  },
  dark: {
    text: '#F1F5F1', background: '#08110C', backgroundElement: '#223229',
    backgroundSelected: '#314A38', textSecondary: '#B7C4BA',
    paper: '#08110C', surface: '#223229', ink: '#F1F5F1', muted: '#B7C4BA',
    green: '#A7D4B0', lightGreen: '#314A38', line: '#415449', controlBorder: '#748779',
    onAccent: '#14271A', onInk: '#17231D', pressed: '#354D3D', actionPressed: '#8EBF99',
    disabled: '#314039', disabledText: '#B7C4BA',
    error: '#FFB4AB', errorBackground: '#3A2524',
    warmSurface: '#29271D', warmAccent: '#E8C98C',
    warning: '#EAC685', warningBackground: '#352D1F',
    success: '#A7D4B0', successBackground: '#314A38',
    info: '#A8CAE5', infoBackground: '#243542',
    chart: '#A7D4B0', chartSecondary: '#B7C4BA', chartTrack: '#415449',
    clay: '#B7C4BA', white: '#F1F5F1',
    scrim: 'rgba(4,10,6,0.65)', shadow: '#0B140E',
    hero: '#223E2B', heroText: '#F1F5F1', heroMuted: '#B7C4BA',
  },
} as const;

export type AppTheme = { [K in keyof typeof Colors.light]: string };

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const platformCardRadius = (radius: number) => radius * 1.15;

export const colorWithOpacity = (color: string, opacity: number) => {
  if (/^#[\da-f]{6}$/i.test(color)) {
    const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
    return `${color}${alpha}`;
  }
  return color;
};

export const Fonts = {
  sans: 'Satoshi',
  serif: 'Satoshi',
  rounded: 'DeliciousHandrawn-Regular',
  mono: 'Satoshi',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const LayoutSpacing = {
  control: 8,
  related: 12,
  group: 16,
  section: 24,
  sectionLarge: 32,
  screenInset: 22,
  cardInset: 16,
  sheetInset: 22,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
