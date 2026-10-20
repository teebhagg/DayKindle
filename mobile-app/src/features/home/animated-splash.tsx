import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Canvas, Path, Skia, useFont, type SkPath } from '@shopify/react-native-skia';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Image as SvgImage } from 'react-native-svg';
import Animated, { Easing, cancelAnimation, runOnJS, useAnimatedStyle, useDerivedValue, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { SquircleSurface } from '@/components/squircle-surface';
import type { SplashTarget } from './splash-transition-context';

const LOGO = require('../../../assets/images/daykindle-logo.png');
const LOGO_SIZE = 1254;
const BRAND_GREEN = '#064B37';
const REVEAL_DURATION = 3200;
const POST_STROKE_FILL_MS = 300;
const POST_REVEAL_HOLD_MS = 1550;
const LOGO_EXIT_DURATION = 750;
const DESTINATION_FADE_DURATION_MS = 200;
const REDUCED_MOTION_FADE_DURATION_MS = 100;
const SKIA_FONT_FALLBACK_MS = 2500;
const WORDMARK = 'DayKindle';
const WORDMARK_FONT_SIZE = 56;
const WORDMARK_HEIGHT = 72;

type AnimatedSplashProps = {
  readyToAnimate: boolean;
  readyToTransition: boolean;
  target: SplashTarget | null;
  onRevealComplete: () => void;
  onScreenRevealStart: () => void;
  onTransitionComplete: () => void;
};

export function AnimatedSplash({ readyToAnimate, readyToTransition, target, onRevealComplete, onScreenRevealStart, onTransitionComplete }: AnimatedSplashProps) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const animationStarted = useSharedValue(false);
  const transitionProgress = useSharedValue(0);
  const destinationRevealProgress = useSharedValue(0);
  const logoExitProgress = useSharedValue(0);
  const handwrittenFont = useFont(require('../../../assets/fonts/DeliciousHandrawn-Regular.ttf'), WORDMARK_FONT_SIZE);
  const logoSize = Math.min(width * 0.78, height * 0.42, 340);
  const wordmarkWidth = Math.min(width * 0.88, 360);
  const transitionStarted = useRef(false);
  const completeReveal = useCallback(() => onRevealComplete(), [onRevealComplete]);
  const revealScreen = useCallback(() => onScreenRevealStart(), [onScreenRevealStart]);
  const completeTransition = useCallback(() => onTransitionComplete(), [onTransitionComplete]);
  const glyphs = useMemo(() => {
    if (!handwrittenFont) return null;
    const completePath = Skia.Path.MakeFromText(WORDMARK, 0, WORDMARK_FONT_SIZE, handwrittenFont);
    if (!completePath) return null;
    const bounds = completePath.computeTightBounds();
    const glyphIds = handwrittenFont.getGlyphIDs(WORDMARK);
    const advances = handwrittenFont.getGlyphWidths(glyphIds);
    const totalAdvance = advances.reduce((sum, advance) => sum + advance, 0);
    const horizontalOffset = (wordmarkWidth - totalAdvance) / 2;
    const verticalOffset = (WORDMARK_HEIGHT - bounds.height) / 2 - bounds.y;
    let cursor = horizontalOffset;
    const result: { path: SkPath; length: number }[] = [];
    for (let index = 0; index < WORDMARK.length; index += 1) {
      const glyph = Skia.Path.MakeFromText(WORDMARK[index], cursor, WORDMARK_FONT_SIZE, handwrittenFont);
      if (glyph) {
        const shiftedGlyph = glyph.offset(0, verticalOffset);
        const contours = Skia.ContourMeasureIter(shiftedGlyph, false, 1);
        let length = 0;
        let contour = contours.next();
        while (contour) {
          length += contour.length();
          contour = contours.next();
        }
        result.push({ path: shiftedGlyph, length });
      }
      cursor += advances[index] ?? 0;
    }
    return result;
  }, [handwrittenFont, wordmarkWidth]);
  const totalGlyphLength = glyphs?.reduce((sum, glyph) => sum + glyph.length, 0) ?? 0;
  const hasTarget = Boolean(target);

  useEffect(() => {
    if (!readyToAnimate || animationStarted.value) return;
    if (!handwrittenFont) {
      const fallbackTimer = setTimeout(() => {
        if (animationStarted.value) return;
        animationStarted.value = true;
        completeReveal();
      }, SKIA_FONT_FALLBACK_MS);
      return () => clearTimeout(fallbackTimer);
    }
    animationStarted.value = true;
    const duration = reduceMotion ? 180 : REVEAL_DURATION;
    progress.value = withSequence(
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) }),
      withTiming(2, { duration: POST_STROKE_FILL_MS, easing: Easing.linear }),
      withDelay(POST_REVEAL_HOLD_MS, withTiming(2.001, { duration: 1, easing: Easing.linear }, (finished) => {
        if (finished) runOnJS(completeReveal)();
      })),
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [animationStarted, completeReveal, handwrittenFont, progress, readyToAnimate, reduceMotion]);
  useEffect(() => {
    if (!readyToTransition || transitionStarted.current) return;
    transitionStarted.current = true;
    const revealDelay = hasTarget ? (reduceMotion ? REDUCED_MOTION_FADE_DURATION_MS : LOGO_EXIT_DURATION) : 0;
    const revealDuration = reduceMotion ? REDUCED_MOTION_FADE_DURATION_MS : DESTINATION_FADE_DURATION_MS;
    if (hasTarget && !reduceMotion) {
      transitionProgress.value = withTiming(1, {
        duration: LOGO_EXIT_DURATION,
        easing: Easing.out(Easing.cubic),
      });
    }
    if (!hasTarget || reduceMotion) {
      logoExitProgress.value = withTiming(1, {
        duration: reduceMotion ? REDUCED_MOTION_FADE_DURATION_MS : DESTINATION_FADE_DURATION_MS,
        easing: Easing.out(Easing.quad),
      });
    }
    const revealTimer = setTimeout(revealScreen, revealDelay);
    destinationRevealProgress.value = withDelay(revealDelay, withTiming(1, {
      duration: revealDuration,
      easing: Easing.out(Easing.quad),
    }, (finished) => {
      if (finished) runOnJS(completeTransition)();
    }));
    return () => {
      clearTimeout(revealTimer);
      cancelAnimation(transitionProgress);
      cancelAnimation(destinationRevealProgress);
      cancelAnimation(logoExitProgress);
    };
  }, [completeTransition, destinationRevealProgress, hasTarget, logoExitProgress, readyToTransition, reduceMotion, revealScreen, transitionProgress]);

  const startLogoTop = (height - (logoSize + 16 + WORDMARK_HEIGHT)) / 2;
  const startLogoCenterY = startLogoTop + logoSize / 2;
  const targetTranslateX = target ? target.x + target.width / 2 - width / 2 : 0;
  const targetTranslateY = target ? target.y + target.height / 2 - startLogoCenterY : 0;
  const targetScale = target ? target.width / logoSize : 1;
  const logoStyle = useAnimatedStyle(() => {
    const flightProgress = target && !reduceMotion ? Math.min(1, transitionProgress.value) : 0;
    const exitProgress = !target || reduceMotion ? logoExitProgress.value : 0;
    return {
      opacity: 1 - exitProgress,
      transform: [
        { translateX: targetTranslateX * flightProgress },
        { translateY: targetTranslateY * flightProgress },
        { scale: 1 + (targetScale - 1) * flightProgress },
      ],
    };
  }, [reduceMotion, targetScale, targetTranslateX, targetTranslateY]);
  const wordmarkStyle = useAnimatedStyle(() => {
    const flightFade = target && !reduceMotion ? Math.min(1, transitionProgress.value) : 0;
    const lockupFade = !target || reduceMotion ? logoExitProgress.value : flightFade;
    return { opacity: (reduceMotion ? Math.min(1, progress.value) : 1) * (1 - lockupFade) };
  });
  const wordmarkFillStyle = useAnimatedStyle(() => ({ opacity: Math.max(0, Math.min(1, progress.value - 1)) }));
  // Onboarding reveals after logo travel; destinations without a target crossfade together.
  const backdropStyle = useAnimatedStyle(() => ({ opacity: 1 - destinationRevealProgress.value }));
  return (
    <Animated.View
      style={styles.container}
      pointerEvents="auto"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
      <View style={styles.brandLockup}>
        <Animated.View style={[styles.logoFrame, { width: logoSize, height: logoSize }, logoStyle]}>
          <SquircleSurface style={styles.logoSquircle} radius={logoSize * 0.32}>
            <Svg width="100%" height="100%" viewBox={`0 0 ${LOGO_SIZE} ${LOGO_SIZE}`}>
              <SvgImage href={LOGO} x={0} y={0} width={LOGO_SIZE} height={LOGO_SIZE} preserveAspectRatio="xMidYMid meet" />
            </Svg>
          </SquircleSurface>
        </Animated.View>
        <Animated.View style={[styles.wordmarkTrack, { width: wordmarkWidth, height: WORDMARK_HEIGHT }, wordmarkStyle]}>
          {glyphs?.length && totalGlyphLength > 0 ? <Canvas style={styles.wordmarkCanvas}>
            {glyphs.map((glyph, index) => <WordmarkStroke
              key={`${WORDMARK[index]}-${index}`}
              path={glyph.path}
              length={glyph.length}
              start={glyphs.slice(0, index).reduce((sum, preceding) => sum + preceding.length, 0) / totalGlyphLength}
              end={glyphs.slice(0, index + 1).reduce((sum, preceding) => sum + preceding.length, 0) / totalGlyphLength}
              progress={progress}
              reduceMotion={reduceMotion}
            />)}
          </Canvas> : null}
          {glyphs?.length && totalGlyphLength > 0 ? <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, wordmarkFillStyle]}>
            <Canvas style={styles.wordmarkCanvas}>
              {glyphs.map((glyph, index) => <Path key={`${WORDMARK[index]}-fill-${index}`} path={glyph.path} color="#FFFFFF" style="fill" />)}
            </Canvas>
          </Animated.View> : null}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function WordmarkStroke({ path, length, start, end, progress, reduceMotion }: { path: SkPath; length: number; start: number; end: number; progress: { value: number }; reduceMotion: boolean }) {
  const trimProgress = useDerivedValue(() => {
    if (reduceMotion || length <= 0) return 1;
    const segmentProgress = Math.max(0, Math.min(1, (progress.value - start) / Math.max(0.001, end - start)));
    return segmentProgress;
  }, [end, length, progress, reduceMotion, start]);
  return <Path path={path} color="#F8F4E9" style="stroke" strokeWidth={2.4} strokeCap="round" strokeJoin="round" start={0} end={trimProgress} />;
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFill, zIndex: 100, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backdrop: { backgroundColor: BRAND_GREEN },
  brandLockup: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  logoFrame: { overflow: 'hidden' },
  // The iOS surface draws a continuous corner but needs clipping for its child image.
  logoSquircle: { flex: 1, overflow: 'hidden' },
  wordmarkTrack: { alignSelf: 'center', overflow: 'hidden' },
  wordmarkCanvas: { width: '100%', height: '100%' },
});
