import { createContext } from 'react';
import { Platform } from 'react-native';
import type { TextStyle } from 'react-native';
import type { VisualStyle } from './home-session';

export const VisualStyleContext = createContext<VisualStyle>('formal');

// Handwritten text has a smaller apparent x-height on Android. Lift its size
// enough to read comfortably while leaving iOS typography unchanged.
export const EXPRESSIVE_FONT_SIZE_MULTIPLIER = Platform.OS === 'android' ? 1.28 : 1.05;

export const fontFamilyForVisualStyle = (visualStyle: VisualStyle) =>
  visualStyle === 'expressive' ? 'DeliciousHandrawn-Regular' : 'Satoshi';

export const textStyleForVisualStyle = (visualStyle: VisualStyle): TextStyle => ({
  fontFamily: fontFamilyForVisualStyle(visualStyle),
  ...(visualStyle === 'expressive' ? { fontWeight: '400', letterSpacing: 0 } : {}),
});

export const nativeFontFamilyForVisualStyle = (visualStyle: VisualStyle) =>
  visualStyle === 'expressive' ? 'DeliciousHandrawn-Regular' : 'SatoshiVariable-Regular';
