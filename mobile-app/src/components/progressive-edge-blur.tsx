import { useEffect, useId, useState } from 'react';
import { ProgressiveBlurView, type ProgressiveBlurViewProps } from 'expo-backdrop';
import { AccessibilityInfo, Platform, StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEFAULT_TOP_HEADER_GRADIENT_HEIGHT } from './header-gradient-metrics';

export type ProgressiveBlurEdge = 'top' | 'bottom' | 'left' | 'right';

export type ProgressiveEdgeBlurProps = {
  edge: ProgressiveBlurEdge;
  surfaceColor: string;
  tintColor?: ColorValue;
  tint?: ProgressiveBlurViewProps['tint'];
  intensity?: number;
  startOffset?: number;
  scrollProgress?: SharedValue<number>;
  revealDistance?: number;
  /** Exact scroll distance over which a top edge reaches full strength. */
  revealScrollDistance?: number;
  /** Use the library's scroll-speed gradient hand-off on older devices. */
  scrollFallback?: ProgressiveBlurViewProps['scrollFallback'];
  /** Render the directional color fade without applying a native blur. */
  gradientOnly?: boolean;
  /** Point in the accessible top fallback fade (0..1) where the gradient starts to soften. */
  topFadeStart?: number;
  /** Put the transparent end of a vertical fade on the named display edge. */
  fadeToTransparentAtEdge?: boolean;
  style?: StyleProp<ViewStyle>;
};

const TOP_EDGE_HEIGHT = DEFAULT_TOP_HEADER_GRADIENT_HEIGHT;
const TOP_FADE_STOPS = [
  // Keep the compact title on an opaque surface, then fade scrolled content
  // away below it. This prevents Android text from showing through the header.
  [0, 1], [0.125, 1], [0.25, 1], [0.375, 1], [0.5, 1], [0.625, 1],
  [0.75, 0.98], [0.8, 0.9], [0.85, 0.76], [0.9, 0.56], [0.95, 0.3], [1, 0],
] as const;
// Android headers begin with 90% white beneath the status bar. Screens with
// sticky filters hold that wash through the filter stack, then fade in the tail.
const ANDROID_TOP_FADE_CURVE = [[0, 0.9], [0.125, 0.87], [0.25, 0.79], [0.375, 0.68], [0.5, 0.54], [0.625, 0.38], [0.75, 0.22], [0.875, 0.08], [1, 0]] as const;

function androidTopFadeStops(fadeStart = 0) {
  const start = Math.max(0, Math.min(0.98, fadeStart));
  if (start === 0) return ANDROID_TOP_FADE_CURVE;
  const tail = ANDROID_TOP_FADE_CURVE.slice(1).map(([position, opacity]) => [start + (1 - start) * position, opacity] as const);
  return [[0, 0.9], [start, 0.9], ...tail] as const;
}
const SIDE_FADE_STOPS = TOP_FADE_STOPS;
// Smoothstep opacity stops keep color from snapping into view at the edge.
const BOTTOM_FADE_STOPS = [1, 0.957, 0.844, 0.684, 0.5, 0.316, 0.156, 0.043, 0].map((opacity, index) => [index * 0.125, opacity] as const);

const edgeStyles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0, height: TOP_EDGE_HEIGHT },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 40 },
  left: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 24 },
  right: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 24 },
});

// Let expo-backdrop replace the live blur with its matching gradient while
// content is moving quickly, then restore the blur as scrolling settles.
const defaultScrollBlurFallback = true;

const transparencyListeners = new Set<(enabled: boolean) => void>();
// Until the iOS preference has been read successfully, use the accessible fade.
let reduceTransparencyEnabled = Platform.OS === 'ios';
let transparencySubscription: ReturnType<typeof AccessibilityInfo.addEventListener> | null = null;
let transparencyObserverInitialized = false;
let transparencyEventVersion = 0;
let transparencyObserverGeneration = 0;

function publishReduceTransparency(enabled: boolean) {
  reduceTransparencyEnabled = enabled;
  transparencyListeners.forEach((listener) => listener(enabled));
}

function initializeTransparencyObserver() {
  if (transparencyObserverInitialized) return;
  transparencyObserverInitialized = true;
  const observerGeneration = ++transparencyObserverGeneration;

  try {
    transparencySubscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', (enabled) => {
      if (observerGeneration !== transparencyObserverGeneration) return;
      transparencyEventVersion += 1;
      publishReduceTransparency(enabled);
    });
    if (!transparencySubscription) throw new Error('Reduce Transparency listener unavailable');
  } catch {
    try {
      transparencySubscription?.remove();
    } catch {
      // Keep native blur when the accessibility observer is unavailable.
    }
    transparencySubscription = null;
    publishReduceTransparency(true);
    return;
  }

  const requestVersion = transparencyEventVersion;
  void AccessibilityInfo.isReduceTransparencyEnabled().then((enabled) => {
    if (observerGeneration === transparencyObserverGeneration && requestVersion === transparencyEventVersion) {
      publishReduceTransparency(enabled);
    }
  }).catch(() => {
    if (observerGeneration === transparencyObserverGeneration && requestVersion === transparencyEventVersion) {
      publishReduceTransparency(true);
    }
  });
}

function subscribeToReduceTransparency(listener: (enabled: boolean) => void) {
  transparencyListeners.add(listener);
  initializeTransparencyObserver();
  listener(reduceTransparencyEnabled);

  return () => {
    transparencyListeners.delete(listener);
    if (transparencyListeners.size === 0) {
      try {
        transparencySubscription?.remove();
      } catch {
        // No listeners remain; the next mount will establish a fresh observer.
      }
      transparencySubscription = null;
      transparencyObserverInitialized = false;
      transparencyEventVersion = 0;
      transparencyObserverGeneration += 1;
      reduceTransparencyEnabled = Platform.OS === 'ios';
    }
  };
}

function useReduceTransparency() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    return subscribeToReduceTransparency(setEnabled);
  }, []);

  return Platform.OS === 'ios' && enabled;
}

function gradientDirection(edge: ProgressiveBlurEdge, fadeToTransparentAtEdge = false) {
  switch (edge) {
    case 'top': return { x1: '0%', y1: '0%', x2: '0%', y2: '100%' };
    case 'bottom': return fadeToTransparentAtEdge
      ? { x1: '0%', y1: '0%', x2: '0%', y2: '100%' }
      : { x1: '0%', y1: '100%', x2: '0%', y2: '0%' };
    case 'left': return { x1: '0%', y1: '0%', x2: '100%', y2: '0%' };
    case 'right': return { x1: '100%', y1: '0%', x2: '0%', y2: '0%' };
  }
}

function withTintOpacity(color: string): ColorValue {
  if (/^#[\da-f]{6}$/i.test(color)) {
    // Android horizontal fades need a strong paper wash so clipped text eases
    // cleanly into the surface instead of lingering as a blurred ghost.
    const alpha = Math.round(0xff * (Platform.OS === 'android' ? 0.95 : 0.14)).toString(16).padStart(2, '0');
    return `${color}${alpha}`;
  }
  return color;
}

export function ProgressiveEdgeBlur({ edge, surfaceColor, tintColor, tint, intensity, startOffset, scrollProgress, revealDistance, revealScrollDistance, scrollFallback, gradientOnly = false, topFadeStart, fadeToTransparentAtEdge = false, style }: ProgressiveEdgeBlurProps) {
  const reduceTransparency = useReduceTransparency();
  const insets = useSafeAreaInsets();
  const gradientId = `progressive-edge-fade-${useId().replace(/:/g, '')}`;
  const defaultIntensity = edge === 'top' ? 72 : edge === 'bottom' ? 32 : 52;
  const blurIntensity = Math.max(0, Math.min(100, Math.round(intensity ?? defaultIntensity)));
  const customTopFadeStops = topFadeStart === undefined ? TOP_FADE_STOPS : (() => {
    const start = Math.max(0, Math.min(0.98, topFadeStart));
    const span = 1 - start;
    return [
      [0, 1], [start, 1], [start + span * 0.25, 0.957], [start + span * 0.5, 0.844],
      [start + span * 0.75, 0.684], [start + span * 0.875, 0.5], [1, 0],
    ] as const;
  })();
  const gradientStops = edge === 'bottom' ? BOTTOM_FADE_STOPS : edge === 'top'
    ? Platform.OS === 'android' ? androidTopFadeStops(topFadeStart) : customTopFadeStops
    : SIDE_FADE_STOPS;
  const gradientSurfaceColor = Platform.OS === 'android' && edge === 'top' ? '#FFFFFF' : surfaceColor;
  // Callers can align the intensity ramp with another animation, such as the
  // expanded-to-compact header transition.
  const scrollRevealDistance = revealScrollDistance ?? Math.max(1, revealDistance ?? TOP_EDGE_HEIGHT);
  const accessibleFallbackStyle = useAnimatedStyle(() => ({
    opacity: edge === 'top' && scrollProgress && Platform.OS !== 'android'
      ? interpolate(scrollProgress.value, [0, scrollRevealDistance], [0, 1], Extrapolation.CLAMP)
      : 1,
  }), [edge, scrollProgress, scrollRevealDistance]);

  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[edgeStyles[edge], edge === 'bottom' && { height: 40 + insets.bottom, opacity: 0.95 }, style, Platform.OS === 'android' && edge === 'top' ? { opacity: 1 } : null]}>
      {gradientOnly || reduceTransparency || (Platform.OS === 'android' && (edge === 'top' || edge === 'bottom')) ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, accessibleFallbackStyle]}>
          <Svg pointerEvents="none" style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100">
            <Defs>
              <LinearGradient id={gradientId} {...gradientDirection(edge, fadeToTransparentAtEdge)}>
                {gradientStops.map(([position, opacity], index) => <Stop key={index} offset={`${position * 100}%`} stopColor={gradientSurfaceColor} stopOpacity={opacity} />)}
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100" height="100" fill={`url(#${gradientId})`} />
          </Svg>
        </Animated.View>
      ) : (
          <ProgressiveBlurView
            edge={edge}
            intensity={blurIntensity}
            startOffset={startOffset ?? 0}
            tint={tint ?? 'systemChromeMaterial'}
            tintColor={tintColor ?? withTintOpacity(surfaceColor)}
            fallbackColor={surfaceColor}
            scrollFallback={scrollFallback ?? defaultScrollBlurFallback}
            style={StyleSheet.absoluteFill}
          />
      )}
    </View>
  );
}
