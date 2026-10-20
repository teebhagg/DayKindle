import { forwardRef, useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type LayoutChangeEvent, type PressableProps, type PressableStateCallbackType, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { CARD_SQUIRCLE_RADIUS_RATIO, SquircleSurface } from './squircle-surface';
import { Radius } from '../constants/theme';

const clearPaint: ViewStyle = {
  backgroundColor: 'transparent',
  borderColor: 'transparent',
  borderWidth: 0,
  borderRadius: 0,
  overflow: 'visible',
};

function backgroundStyle(style: StyleProp<ViewStyle>, radius: number): ViewStyle {
  const resolved = StyleSheet.flatten(style) ?? {};
  return {
    ...StyleSheet.absoluteFill,
    backgroundColor: resolved.backgroundColor ?? 'transparent',
    borderColor: resolved.borderColor ?? 'transparent',
    borderWidth: resolved.borderWidth ?? 0,
    borderRadius: radius,
  };
}

function useMeasuredRadius(fallbackRadius: number, onLayout?: ViewProps['onLayout'], radiusRatio = CARD_SQUIRCLE_RADIUS_RATIO) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const radius = radiusRatio === CARD_SQUIRCLE_RADIUS_RATIO
    ? fallbackRadius
    : size.width > 0 && size.height > 0
      ? Math.min(size.width, size.height) * radiusRatio
      : fallbackRadius;
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    if (radiusRatio !== CARD_SQUIRCLE_RADIUS_RATIO) {
      const { width, height } = event.nativeEvent.layout;
      setSize((current) => current.width === width && current.height === height ? current : { width, height });
    }
    onLayout?.(event);
  }, [onLayout, radiusRatio]);
  return { radius, handleLayout };
}

function fallbackRadius(style: StyleProp<ViewStyle>) {
  const resolved = StyleSheet.flatten(style) ?? {};
  return typeof resolved.borderRadius === 'number' ? resolved.borderRadius : Radius.card;
}

type SquircleCardProps = ViewProps & { radiusRatio?: number; exactSquircle?: boolean };

export function SquircleCard({ children, style, onLayout, radiusRatio = CARD_SQUIRCLE_RADIUS_RATIO, exactSquircle = false, ...props }: SquircleCardProps) {
  const { radius, handleLayout } = useMeasuredRadius(fallbackRadius(style), onLayout, radiusRatio);
  if (Platform.OS !== 'android' && !exactSquircle) {
    return <View {...props} onLayout={handleLayout} style={[style, { borderRadius: radius, borderCurve: 'continuous' }]}>{children}</View>;
  }
  return <View {...props} onLayout={handleLayout} style={[style, clearPaint]}>
    <SquircleSurface pointerEvents="none" radius={radius} exactSquircle={exactSquircle} style={backgroundStyle(style, radius)} />
    {children}
  </View>;
}

export type SquirclePressableProps = PressableProps & { radiusRatio?: number; exactSquircle?: boolean; pill?: boolean; nativeShape?: boolean };

export const SquirclePressable = forwardRef<View, SquirclePressableProps>(function SquirclePressable({ children, style, onLayout, radiusRatio = CARD_SQUIRCLE_RADIUS_RATIO, exactSquircle = false, pill = false, nativeShape = false, ...props }, ref) {
  const resolveStyle = (state: PressableStateCallbackType) => typeof style === 'function' ? style(state) : style;
  const initialStyle = StyleSheet.flatten(resolveStyle({ pressed: false, hovered: false })) ?? {};
  const { radius, handleLayout } = useMeasuredRadius(fallbackRadius(initialStyle), onLayout, radiusRatio);
  const explicitPill = typeof initialStyle.borderRadius === 'number' && initialStyle.borderRadius >= 99;
  const circularRadius = pill || explicitPill ? Radius.pill : initialStyle.borderRadius ?? radius;
  if (nativeShape || pill || explicitPill || initialStyle.borderCurve === 'circular') {
    return <Pressable {...props} ref={ref} onLayout={handleLayout} style={(state) => [resolveStyle(state), { borderRadius: circularRadius, borderCurve: nativeShape && !pill && !explicitPill ? 'continuous' : 'circular' }]}>{children}</Pressable>;
  }
  if (Platform.OS !== 'android' && !exactSquircle) {
    return <Pressable {...props} ref={ref} onLayout={handleLayout} style={(state) => [resolveStyle(state), { borderRadius: radius, borderCurve: 'continuous' }]}>{children}</Pressable>;
  }
  return <Pressable
    {...props}
    ref={ref}
    onLayout={handleLayout}
    style={(state) => [resolveStyle(state), clearPaint]}
  >
    {(state) => <>
      <SquircleSurface pointerEvents="none" radius={radius} exactSquircle={exactSquircle} style={backgroundStyle(resolveStyle(state), radius)} />
      {typeof children === 'function' ? children(state) : children}
    </>}
  </Pressable>;
});
