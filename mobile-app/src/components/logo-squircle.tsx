import type { ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { SplashLogoCornerRadiusRatio } from '@/constants/theme';
import { SquircleSurface } from '@/components/squircle-surface';

/**
 * The app-logo shape. iOS uses the native continuous corner, which is the system
 * squircle and is clipped on the first frame, so the logo never shows square corners
 * while a Skia mask is still being prepared. Android keeps the smoothed SVG surface.
 */
export function LogoSquircle({ size, style, children }: { size: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const radius = size * SplashLogoCornerRadiusRatio;
  if (Platform.OS === 'ios') {
    return <View style={[{ width: size, height: size, borderRadius: radius, borderCurve: 'continuous', overflow: 'hidden' }, style]}>{children}</View>;
  }
  return <SquircleSurface style={[{ width: size, height: size }, style]} radius={radius}>{children}</SquircleSurface>;
}
