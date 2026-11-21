import { forwardRef, useCallback, useState, type ComponentProps, type ComponentRef, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type LayoutChangeEvent, type PressableProps, type PressableStateCallbackType, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { CARD_SQUIRCLE_RADIUS_RATIO, SquircleSurface } from './squircle-surface';
import { colorWithOpacity, normalizeCornerRadius, Radius } from '../constants/theme';
import { useTheme } from '../hooks/use-theme';
import { UI_MOTION } from '../constants/motion';

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

function normalizePillRadius(radius: number) {
  return radius >= Radius.pill ? Radius.pill : normalizeCornerRadius(radius);
}

type SquircleCardProps = ViewProps & { radiusRatio?: number };

export const SquircleCard = forwardRef<View, SquircleCardProps>(function SquircleCard({ children, style, onLayout, radiusRatio = CARD_SQUIRCLE_RADIUS_RATIO, ...props }, ref) {
  const rawRadius = fallbackRadius(style);
  const isCircle = hasCircularGeometry(style, rawRadius);
  const { radius, handleLayout } = useMeasuredRadius(isCircle ? rawRadius : normalizeCornerRadius(rawRadius), onLayout, radiusRatio);
  if (isCircle) {
    return <View {...props} ref={ref} onLayout={handleLayout} style={[style, { borderRadius: radius, borderCurve: 'circular' }]}>{children}</View>;
  }
  if (Platform.OS === 'web') {
    return <View {...props} ref={ref} onLayout={handleLayout} style={[style, { borderRadius: radius, borderCurve: 'continuous' }]}>{children}</View>;
  }
  return <View {...props} ref={ref} onLayout={handleLayout} style={[style, clearPaint]}>
    <SquircleSurface pointerEvents="none" radius={radius} style={backgroundStyle(style, radius)} />
    {children}
  </View>;
});

export type SquircleViewProps = ViewProps & { radiusRatio?: number };

function hasCircularGeometry(style: StyleProp<ViewStyle>, radius: number) {
  const resolved = StyleSheet.flatten(style) ?? {};
  return typeof resolved.width === 'number'
    && resolved.width === resolved.height
    && radius >= resolved.width / 2;
}

/** Applies the shared squircle treatment to any rounded rectangular surface. */
export const SquircleView = forwardRef<View, SquircleViewProps>(function SquircleView({ style, radiusRatio, ...props }, ref) {
  const resolved = StyleSheet.flatten(style) ?? {};
  const rawRadius = typeof resolved.borderRadius === 'number' ? resolved.borderRadius : 0;
  const isCircle = hasCircularGeometry(style, rawRadius);
  const radius = isCircle ? rawRadius : normalizeCornerRadius(rawRadius);
  const normalizedStyle = radius === rawRadius ? style : [style, { borderRadius: radius }];
  if (radius <= 0 || isCircle) {
    return <View {...props} ref={ref} style={isCircle ? [style, { borderCurve: 'circular' }] : style} />;
  }
  if (Platform.OS === 'web') {
    return <View {...props} ref={ref} style={[normalizedStyle, { borderCurve: 'continuous' }]} />;
  }
  if (resolved.overflow === 'hidden') {
    return <SquircleSurface {...props} ref={ref} style={normalizedStyle} radius={radius} />;
  }
  return <SquircleCard {...props} ref={ref} style={normalizedStyle} radiusRatio={radiusRatio} />;
});

type AnimatedSquircleViewProps = ComponentProps<typeof Animated.View>;
type AnimatedSquircleViewRef = ComponentRef<typeof Animated.View>;

export const AnimatedSquircleView = forwardRef<AnimatedSquircleViewRef, AnimatedSquircleViewProps>(function AnimatedSquircleView({ children, style, ...props }, ref) {
  const viewStyle = style as unknown as StyleProp<ViewStyle>;
  const resolved = StyleSheet.flatten(viewStyle) ?? {};
  const rawRadius = typeof resolved.borderRadius === 'number' ? resolved.borderRadius : 0;
  const isCircle = hasCircularGeometry(viewStyle, rawRadius);
  const radius = isCircle ? rawRadius : normalizeCornerRadius(rawRadius);
  const childContent = children as ReactNode;
  if (radius <= 0 || isCircle || Platform.OS === 'web') {
    const borderCurve = isCircle ? 'circular' : radius > 0 ? 'continuous' : undefined;
    return <Animated.View {...props} ref={ref} style={borderCurve ? [style, { borderRadius: radius, borderCurve }] : style}>{children}</Animated.View>;
  }
  const background = backgroundStyle(viewStyle, radius);
  const contentMaskStyle: ViewStyle = { ...StyleSheet.absoluteFill, backgroundColor: 'transparent', borderRadius: radius };
  return (
    <Animated.View {...props} ref={ref} style={[style, { backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 0, borderRadius: radius, overflow: 'visible' }]}>
      <SquircleSurface pointerEvents="none" radius={radius} style={background} />
      {resolved.overflow === 'hidden' && children != null
        ? <SquircleSurface pointerEvents="box-none" radius={radius} style={contentMaskStyle}>{childContent}</SquircleSurface>
        : childContent}
    </Animated.View>
  );
});

export type SquirclePressableProps = PressableProps & { radiusRatio?: number; nativePill?: boolean; nativeShape?: boolean };

export const SquirclePressable = forwardRef<View, SquirclePressableProps>(function SquirclePressable({ children, style, onLayout, onPressIn, onPressOut, radiusRatio = CARD_SQUIRCLE_RADIUS_RATIO, nativePill = false, nativeShape = false, ...props }, ref) {
  const palette = useTheme();
  const reduceMotion = useReducedMotion();
  const pressProgress = useSharedValue(0);
  const pressFeedbackStyle = useAnimatedStyle(() => ({ opacity: pressProgress.value * UI_MOTION.pressOverlayOpacity }));
  const handlePressIn: NonNullable<PressableProps['onPressIn']> = (event) => {
    pressProgress.value = reduceMotion || Platform.OS !== 'ios' ? 0 : withTiming(1, { duration: UI_MOTION.pressInMs });
    onPressIn?.(event);
  };
  const handlePressOut: NonNullable<PressableProps['onPressOut']> = (event) => {
    pressProgress.value = reduceMotion ? 0 : withTiming(0, { duration: UI_MOTION.pressOutMs });
    onPressOut?.(event);
  };
  const renderChildren = (state: PressableStateCallbackType, cornerRadius: number) => {
    const content = typeof children === 'function' ? children(state) : children;
    return <>
      {content}
      {Platform.OS === 'ios' && !reduceMotion && <AnimatedSquircleView pointerEvents="none" style={[StyleSheet.absoluteFill, pressFeedbackStyle, { backgroundColor: palette.ink, borderRadius: cornerRadius }]} />}
    </>;
  };
  const resolveStyle = (state: PressableStateCallbackType) => typeof style === 'function' ? style(state) : style;
  const initialStyle = StyleSheet.flatten(resolveStyle({ pressed: false, hovered: false })) ?? {};
  const rawStyleRadius = typeof initialStyle.borderRadius === 'number' ? initialStyle.borderRadius : 0;
  const isCircle = !nativePill && hasCircularGeometry(initialStyle, rawStyleRadius);
  const styleRadius = isCircle ? rawStyleRadius : nativePill ? Radius.pill : normalizePillRadius(rawStyleRadius);
  const hasRoundedStyle = nativePill || rawStyleRadius > 0;
  // A zero radius is often used to remove the visible outline; keep the touch
  // feedback softly clipped instead of allowing a square Android ripple.
  const fallback = nativePill ? Radius.pill : styleRadius || (rawStyleRadius > 0 ? fallbackRadius(initialStyle) : Radius.card);
  const { radius, handleLayout } = useMeasuredRadius(fallback, onLayout, radiusRatio);
  // Android buttons without an explicit radius still use the squircle surface instead of the native corner.
  if (!hasRoundedStyle && Platform.OS !== 'android') return <Pressable {...props} ref={ref} onPressIn={handlePressIn} onPressOut={handlePressOut} onLayout={handleLayout} style={(state) => [resolveStyle(state), { borderRadius: radius, borderCurve: 'continuous', overflow: 'hidden' }]}>{(state) => renderChildren(state, radius)}</Pressable>;
  // Android pills use the shared squircle surface too; only iOS keeps the native pill curve.
  if (nativePill && Platform.OS === 'ios') {
    return <Pressable {...props} ref={ref} onPressIn={handlePressIn} onPressOut={handlePressOut} onLayout={handleLayout} style={(state) => [resolveStyle(state), { borderRadius: Radius.pill, borderCurve: 'circular', overflow: 'hidden' }]}>{(state) => renderChildren(state, Radius.pill)}</Pressable>;
  }
  if (isCircle) {
    return <Pressable {...props} android_ripple={props.android_ripple ?? (Platform.OS === 'android' ? { color: colorWithOpacity(palette.green, 0.14), borderless: false, foreground: true } : undefined)} ref={ref} onPressIn={handlePressIn} onPressOut={handlePressOut} onLayout={handleLayout} style={(state) => [resolveStyle(state), { borderRadius: radius, borderCurve: 'circular', overflow: 'hidden' }]}>{(state) => renderChildren(state, radius)}</Pressable>;
  }
  if (Platform.OS === 'web') {
    return <Pressable {...props} ref={ref} android_ripple={props.android_ripple} onPressIn={handlePressIn} onPressOut={handlePressOut} onLayout={handleLayout} style={(state) => [resolveStyle(state), { borderRadius: radius, borderCurve: 'continuous' }]}>{(state) => renderChildren(state, radius)}</Pressable>;
  }
  return <Pressable
    {...props}
    android_ripple={props.android_ripple ?? { color: colorWithOpacity(palette.green, 0.14), borderless: false, foreground: true }}
    ref={ref}
    onPressIn={handlePressIn}
    onPressOut={handlePressOut}
    onLayout={handleLayout}
    style={(state) => [resolveStyle(state), { ...clearPaint, borderRadius: radius, overflow: 'hidden' }]}
  >
    {(state) => {
      const stateStyle = resolveStyle(state);
      const stateChildren = typeof children === 'function' ? children(state) : children;
      const flattenedStateStyle = StyleSheet.flatten(stateStyle) ?? {};
      return <>
        <SquircleSurface pointerEvents="none" radius={radius} style={backgroundStyle(stateStyle, radius)} />
        {flattenedStateStyle.overflow === 'hidden' && stateChildren != null
          ? <SquircleSurface pointerEvents="box-none" radius={radius} style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent', borderRadius: radius }]}>{stateChildren}</SquircleSurface>
          : stateChildren}
        {Platform.OS === 'ios' && !reduceMotion && <AnimatedSquircleView pointerEvents="none" style={[StyleSheet.absoluteFill, pressFeedbackStyle, { backgroundColor: palette.ink, borderRadius: radius }]} />}
      </>;
    }}
  </Pressable>;
});
