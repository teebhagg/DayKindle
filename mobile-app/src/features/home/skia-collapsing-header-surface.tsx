import { Canvas, LinearGradient, Path as SkiaPath, Skia, usePathInterpolation, vec } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

type SkiaCollapsingHeaderSurfaceProps = {
  width: number;
  expandedHeight: number;
  collapsedHeight: number;
  surfaceColor: string;
  collapseProgress: SharedValue<number>;
};

function createHeaderPath(width: number, height: number, radius: number) {
  const corner = Math.max(0, Math.min(radius, height / 2, width / 2));
  return Skia.Path.Make()
    .moveTo(0, 0)
    .lineTo(width, 0)
    .lineTo(width, height - corner)
    .quadTo(width, height, width - corner, height)
    .lineTo(corner, height)
    .quadTo(0, height, 0, height - corner)
    .close();
}

export function SkiaCollapsingHeaderSurface({
  width,
  expandedHeight,
  collapsedHeight,
  surfaceColor,
  collapseProgress,
}: SkiaCollapsingHeaderSurfaceProps) {
  const expandedPath = useMemo(() => createHeaderPath(width, expandedHeight, 0), [expandedHeight, width]);
  const collapsedPath = useMemo(() => createHeaderPath(width, collapsedHeight, 0), [collapsedHeight, width]);
  const inputRange = useMemo(() => [0, 1], []);
  const outputRange = useMemo(() => [expandedPath, collapsedPath], [collapsedPath, expandedPath]);
  const headerPath = usePathInterpolation(collapseProgress, inputRange, outputRange);
  const gradientEnd = useDerivedValue(() => ({
    x: 0,
    y: expandedHeight + (collapsedHeight - expandedHeight) * collapseProgress.value,
  }), [collapsedHeight, collapseProgress, expandedHeight]);
  const washColors = useMemo(() => {
    // Fade progressively from the status bar to the morphing lower edge.
    const alphas = [1, 0.957, 0.844, 0.684, 0.5, 0.316, 0.156, 0.043, 0];
    return alphas.map((alpha) => `${surfaceColor}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`);
  }, [surfaceColor]);
  const washPositions = useMemo(() => [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1], []);

  return (
    <Canvas pointerEvents="none" style={[styles.canvas, { width, height: expandedHeight }]}>
      <SkiaPath path={headerPath}>
        <LinearGradient start={vec(0, 0)} end={gradientEnd} colors={washColors} positions={washPositions} />
      </SkiaPath>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: { position: 'absolute', top: 0, left: 0 },
});
