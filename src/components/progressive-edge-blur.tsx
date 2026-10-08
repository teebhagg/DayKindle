import { useEffect, useId, useState } from 'react';
import { ProgressiveBlurView } from 'expo-backdrop';
import { AccessibilityInfo, Platform, StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { DEFAULT_TOP_HEADER_GRADIENT_HEIGHT, HEADER_BLUR_WASH_SCALE, scaleHeaderGradientHeight } from './header-gradient-metrics';

export type ProgressiveBlurEdge = 'top' | 'bottom' | 'left' | 'right';

export type ProgressiveEdgeBlurProps = {
  edge: ProgressiveBlurEdge;
  surfaceColor: string;
  intensity?: number;
  style?: StyleProp<ViewStyle>;
};

const edgeStyles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0, height: scaleHeaderGradientHeight(DEFAULT_TOP_HEADER_GRADIENT_HEIGHT) },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 88 },
  left: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 24 },
  right: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 24 },
});

const transparencyListeners = new Set<(enabled: boolean) => void>();
let reduceTransparencyEnabled = false;
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
    publishReduceTransparency(false);
    return;
  }

  const requestVersion = transparencyEventVersion;
  void AccessibilityInfo.isReduceTransparencyEnabled().then((enabled) => {
    if (observerGeneration === transparencyObserverGeneration && requestVersion === transparencyEventVersion) {
      publishReduceTransparency(enabled);
    }
  }).catch(() => {
    if (observerGeneration === transparencyObserverGeneration && requestVersion === transparencyEventVersion) {
      publishReduceTransparency(false);
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
      reduceTransparencyEnabled = false;
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

function gradientDirection(edge: ProgressiveBlurEdge) {
  switch (edge) {
    case 'top': return { x1: '0%', y1: '0%', x2: '0%', y2: '100%' };
    case 'bottom': return { x1: '0%', y1: '100%', x2: '0%', y2: '0%' };
    case 'left': return { x1: '0%', y1: '0%', x2: '100%', y2: '0%' };
    case 'right': return { x1: '100%', y1: '0%', x2: '0%', y2: '0%' };
  }
}

function withTintOpacity(color: string, opacityScale: number): ColorValue {
  if (/^#[\da-f]{6}$/i.test(color)) {
    const alpha = Math.min(0xff, Math.round(0x80 * opacityScale)).toString(16).padStart(2, '0');
    return `${color}${alpha}`;
  }
  return color;
}

export function ProgressiveEdgeBlur({ edge, surfaceColor, intensity, style }: ProgressiveEdgeBlurProps) {
  const reduceTransparency = useReduceTransparency();
  const gradientId = `progressive-edge-fade-${useId().replace(/:/g, '')}`;

  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[edgeStyles[edge], style, { opacity: Platform.OS === 'android' && edge === 'top' ? 0.97 : 0.95 }]}>
      {/* Android's native backdrop can obscure the whole screen after navigation. Use a bounded wash. */}
      {reduceTransparency || Platform.OS === 'android' ? (
        <Svg pointerEvents="none" style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id={gradientId} {...gradientDirection(edge)}>
              <Stop offset="0%" stopColor={surfaceColor} stopOpacity={1} />
              <Stop offset="100%" stopColor={surfaceColor} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill={`url(#${gradientId})`} />
        </Svg>
      ) : (
        <ProgressiveBlurView
          edge={edge}
          intensity={Math.round(intensity ?? 75)}
          startOffset={0}
          tint="systemChromeMaterial"
          tintColor={withTintOpacity(surfaceColor, edge === 'top' ? HEADER_BLUR_WASH_SCALE : 1)}
          fallbackColor={surfaceColor}
          scrollFallback
          style={StyleSheet.absoluteFill}
        />
      )}
    </View>
  );
}
