import { Platform } from 'react-native';

export const HEADER_GRADIENT_HEIGHT_SCALE = 1;
export const HEADER_BLUR_INTENSITY_SCALE = 0.725;
export const HEADER_BLUR_WASH_SCALE = 0.5;
export const DEFAULT_TOP_HEADER_GRADIENT_HEIGHT = 150;
export const APP_NON_TAB_HEADER_HEIGHT = 60;
export const APP_TAB_COMPACT_HEADER_HEIGHT = 80;
export const APP_TAB_COMPACT_HEADER_TITLE_LAYOUT_OFFSET = -10;
// Keep the status-bar-to-header fade extent independent of header geometry.
export const APP_HEADER_FADE_CONTENT_HEIGHT = 80;

export function scaleHeaderGradientHeight(height: number) {
  'worklet';
  return Math.max(0, height);
}

export function topHeaderBlurHeight(headerHeight: number) {
  'worklet';
  return Math.max(0, headerHeight);
}

export function scaleHeaderBlurIntensity(intensity: number) {
  return Math.min(100, intensity * HEADER_BLUR_INTENSITY_SCALE);
}

/** Height of the title and back-button row. iOS uses the native 44pt navigation-bar row; layout offsets keep APP_NON_TAB_HEADER_HEIGHT. */
export const APP_HEADER_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : APP_NON_TAB_HEADER_HEIGHT;

/** iOS-only bottom padding that lifts the title row by half this value. Measured on the simulator: title cap-height center sat ~0.6pt low against the back circle without it, so 1 gives ~0.5pt lift. */
export const IOS_TITLE_OPTICAL_PADDING_BOTTOM = Platform.OS === 'ios' ? 1 : 0;
