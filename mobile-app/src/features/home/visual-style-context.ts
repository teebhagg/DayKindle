import { createContext } from 'react';
import { Platform } from 'react-native';
import type { TextStyle } from 'react-native';
import type { VisualStyle } from './home-session';

export const VisualStyleContext = createContext<VisualStyle>('formal');

// Handwritten text has a smaller apparent x-height on Android. Lift its size
// enough to read comfortably while leaving iOS typography unchanged.
export const EXPRESSIVE_FONT_SIZE_MULTIPLIER = Platform.OS === 'android' ? 1.25 : 1.1;

// SDK 57 cannot select arbitrary variable-font weights, so formal body text uses
// a static instance of Satoshi's lightest available face (weight 300).
export const fontFamilyForVisualStyle = (visualStyle: VisualStyle) =>
  visualStyle === 'expressive' ? 'DeliciousHandrawn-Regular' : 'SatoshiLight';

export const headingFontFamilyForVisualStyle = (visualStyle: VisualStyle) =>
  visualStyle === 'expressive' ? 'DeliciousHandrawn-Regular' : 'SatoshiBold';

export const textStyleForVisualStyle = (visualStyle: VisualStyle): TextStyle => ({
  fontFamily: fontFamilyForVisualStyle(visualStyle),
  fontWeight: visualStyle === 'expressive' ? '400' : '200',
  ...(visualStyle === 'expressive' ? { letterSpacing: 0 } : {}),
});

export const nativeFontFamilyForVisualStyle = (visualStyle: VisualStyle) =>
  visualStyle === 'expressive' ? 'DeliciousHandrawn-Regular' : 'Satoshi-Light-Preview';
