import { Platform } from 'react-native';

export const HEADER_GRADIENT_HEIGHT_SCALE = 1.4;
export const HEADER_BLUR_INTENSITY_SCALE = 1.725;
export const HEADER_BLUR_WASH_SCALE = 1.5;
export const DEFAULT_TOP_HEADER_GRADIENT_HEIGHT = 220;
export const APP_STANDARD_HEADER_HEIGHT = 60;

const ANDROID_HEADER_HEIGHT_REDUCTION = Platform.OS === 'android' ? 8 : 0;

export function scaleHeaderGradientHeight(height: number) {
  'worklet';
  return Math.max(0, height * HEADER_GRADIENT_HEIGHT_SCALE - ANDROID_HEADER_HEIGHT_REDUCTION);
}

export function scaleHeaderBlurIntensity(intensity: number) {
  return Math.min(100, intensity * HEADER_BLUR_INTENSITY_SCALE);
}
