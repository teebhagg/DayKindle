import { useTheme } from '@/hooks/use-theme';
import { useId } from 'react';
import { StyleSheet, type ColorValue } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import type { ProgressiveBlurEdge, ProgressiveEdgeBlurProps } from './progressive-edge-blur';
import { DEFAULT_TOP_HEADER_GRADIENT_HEIGHT } from './header-gradient-metrics';

const edgeStyles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0, height: DEFAULT_TOP_HEADER_GRADIENT_HEIGHT },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 40 },
  left: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 24 },
  right: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 24 },
});

function gradientDirection(edge: ProgressiveBlurEdge) {
  switch (edge) {
    case 'top': return { x1: '0%', y1: '0%', x2: '0%', y2: '100%' };
    case 'bottom': return { x1: '0%', y1: '100%', x2: '0%', y2: '0%' };
    case 'left': return { x1: '0%', y1: '0%', x2: '100%', y2: '0%' };
    case 'right': return { x1: '100%', y1: '0%', x2: '0%', y2: '0%' };
  }
}

function isColorValueHex(color: string): color is `#${string}` {
  return /^#[\da-f]{6}$/i.test(color);
}

export function ProgressiveEdgeBlur({ edge, surfaceColor, style }: ProgressiveEdgeBlurProps) {
  const theme = useTheme();
  const gradientId = `progressive-edge-${useId().replace(/:/g, '')}`;
  const direction = gradientDirection(edge);
  const fill: ColorValue = isColorValueHex(surfaceColor) ? surfaceColor : theme.paper;

  return (
    <Svg
      pointerEvents="none"
      style={[edgeStyles[edge], styles.overlay, { opacity: 0.95 }, style]}
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <Defs>
        <LinearGradient id={gradientId} {...direction}>
          {[1, 0.985, 0.955, 0.91, 0.84, 0.73, 0.57, 0.33, 0].map((opacity, index) => <Stop key={index} offset={`${index * 12.5}%`} stopColor={fill} stopOpacity={opacity} />)}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill={`url(#${gradientId})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  overlay: {},
});
