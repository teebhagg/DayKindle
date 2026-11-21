import { forwardRef, useMemo, useState } from 'react';
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { MaskedView } from '@expo/ui/community/masked-view';
import { Platform, StyleSheet, View, type LayoutChangeEvent, type ViewProps, type ViewStyle } from 'react-native';
import { Radius } from '../constants/theme';

type SquircleSurfaceProps = ViewProps & { radius?: number; color?: string; borderColor?: string; borderWidth?: number };
export const CARD_SQUIRCLE_RADIUS_RATIO = 0.14;

export function squircleRadiusForSize(width: number, height: number) {
  return Math.min(width, height) * CARD_SQUIRCLE_RADIUS_RATIO;
}

const CORNER_SMOOTHING = 0.9;

/**
 * Shared continuous corner (Figma-style corner smoothing). Each corner is
 * cubic ease-in, a circular arc, then cubic ease-out, so curvature ramps up over
 * about 1.8x the radius instead of switching on abruptly like a plain rounded rect.
 */
function createSmoothedPath(width: number, height: number, radius: number) {
  const path = Skia.Path.Make();
  const maxR = Math.min(width, height) / 2;
  const R = Math.min(radius, maxR);
  if (R <= 0) {
    path.addRect({ x: 0, y: 0, width, height });
    return path;
  }
  const xi = Math.max(0, Math.min(CORNER_SMOOTHING, maxR / R - 1));
  const p = (1 + xi) * R;
  const theta = (Math.PI / 2) * (1 - xi); // sweep of the circular arc
  const beta = (Math.PI / 4) * xi; // tangent angle at the ease/arc join
  const arcLen = Math.sin(theta / 2) * R * Math.SQRT2;
  const c = R * Math.tan((Math.PI / 2 - theta) / 4) * Math.cos(beta);
  const d = c * Math.tan(beta);
  const b = (p - arcLen - c - d) / 3;
  const a = 2 * b;
  const k = (4 / 3) * Math.tan(theta / 4) * R;

  // Corner in local coordinates (top-right corner, origin at its top-left, ending at (p, p)).
  const x1 = a + b + c;
  const arcEnd = { x: x1 + arcLen, y: d + arcLen };
  const local: number[][] = [
    [a, 0, a + b, 0, x1, d],
    [x1 + k * Math.cos(beta), d + k * Math.sin(beta), arcEnd.x - k * Math.cos(beta + theta), arcEnd.y - k * Math.sin(beta + theta), arcEnd.x, arcEnd.y],
    [arcEnd.x + d, arcEnd.y + c, arcEnd.x + d, arcEnd.y + b + c, p, p],
  ];
  const place: ((x: number, y: number) => [number, number])[] = [
    (x, y) => [width - p + x, y],
    (x, y) => [width - y, height - p + x],
    (x, y) => [p - x, height - y],
    (x, y) => [y, p - x],
  ];
  place.forEach((map, index) => {
    const [sx, sy] = map(0, 0);
    if (index === 0) path.moveTo(sx, sy);
    else path.lineTo(sx, sy);
    local.forEach(([ax, ay, bx, by, ex, ey]) => {
      const [x1m, y1m] = map(ax, ay);
      const [x2m, y2m] = map(bx, by);
      const [x3m, y3m] = map(ex, ey);
      path.cubicTo(x1m, y1m, x2m, y2m, x3m, y3m);
    });
  });
  path.close();
  return path;
}


/** Same Figma-style corner as createSmoothedPath, emitted as SVG path data for Android (react-native-svg uses no GL surface). */
function smoothedSvgPath(width: number, height: number, radius: number, inset: number) {
  const w = width - inset * 2;
  const h = height - inset * 2;
  const maxR = Math.min(w, h) / 2;
  const R = Math.min(radius, maxR);
  const at = (x: number, y: number) => `${(x + inset).toFixed(2)} ${(y + inset).toFixed(2)}`;
  if (R <= 0) return `M${at(0, 0)} L${at(w, 0)} L${at(w, h)} L${at(0, h)} Z`;
  const xi = Math.max(0, Math.min(CORNER_SMOOTHING, maxR / R - 1));
  const p = (1 + xi) * R;
  const theta = (Math.PI / 2) * (1 - xi);
  const beta = (Math.PI / 4) * xi;
  const arcLen = Math.sin(theta / 2) * R * Math.SQRT2;
  const c = R * Math.tan((Math.PI / 2 - theta) / 4) * Math.cos(beta);
  const d = c * Math.tan(beta);
  const b = (p - arcLen - c - d) / 3;
  const a = 2 * b;
  const k = (4 / 3) * Math.tan(theta / 4) * R;
  const x1 = a + b + c;
  const arcEnd = { x: x1 + arcLen, y: d + arcLen };
  const local: number[][] = [
    [a, 0, a + b, 0, x1, d],
    [x1 + k * Math.cos(beta), d + k * Math.sin(beta), arcEnd.x - k * Math.cos(beta + theta), arcEnd.y - k * Math.sin(beta + theta), arcEnd.x, arcEnd.y],
    [arcEnd.x + d, arcEnd.y + c, arcEnd.x + d, arcEnd.y + b + c, p, p],
  ];
  const place: ((x: number, y: number) => [number, number])[] = [
    (x, y) => [w - p + x, y],
    (x, y) => [w - y, h - p + x],
    (x, y) => [p - x, h - y],
    (x, y) => [y, p - x],
  ];
  let dStr = '';
  place.forEach((map, index) => {
    const [sx, sy] = map(0, 0);
    dStr += index === 0 ? `M${at(sx, sy)} ` : `L${at(sx, sy)} `;
    local.forEach(([ax, ay, bx, by, ex, ey]) => {
      const [x1m, y1m] = map(ax, ay);
      const [x2m, y2m] = map(bx, by);
      const [x3m, y3m] = map(ex, ey);
      dStr += `C${at(x1m, y1m)} ${at(x2m, y2m)} ${at(x3m, y3m)} `;
    });
  });
  return dStr + 'Z';
}

function SvgSquircleFill({ width, height, radius, fill, stroke, strokeWidth }: { width: number; height: number; radius: number; fill?: string; stroke?: string; strokeWidth: number }) {
  if (width <= 0 || height <= 0) return null;
  const inset = stroke && strokeWidth > 0 ? strokeWidth / 2 : 0;
  return (
    // Yoga reports layout widths floored to whole pixels; the SVG viewport must round up or the right edge is clipped.
    <Svg width={Math.ceil(width)} height={Math.ceil(height)} pointerEvents="none" style={StyleSheet.absoluteFill}>
      <SvgPath d={smoothedSvgPath(width, height, radius, inset)} fill={fill ?? 'none'} stroke={stroke ?? 'none'} strokeWidth={stroke ? strokeWidth : 0} />
    </Svg>
  );
}

/** Shared squircle surface: the same smoothed Skia path clips native content on iOS and Android. */
export const SquircleSurface = forwardRef<View, SquircleSurfaceProps>(function SquircleSurface({ children, style, radius, color, borderColor, borderWidth, onLayout, ...viewProps }, ref) {
  const flattenedStyle = StyleSheet.flatten(style) ?? {};
  const [size, setSize] = useState({ width: 0, height: 0 });
  const fallbackRadius = typeof flattenedStyle.borderRadius === 'number' ? flattenedStyle.borderRadius : Radius.card;
  const cornerRadius = radius ?? (size.width > 0 && size.height > 0 ? squircleRadiusForSize(size.width, size.height) : fallbackRadius);
  const fill = color ?? flattenedStyle.backgroundColor;
  const stroke = borderColor ?? flattenedStyle.borderColor;
  const strokeWidth = borderWidth ?? (typeof flattenedStyle.borderWidth === 'number' ? flattenedStyle.borderWidth : 0);
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) => current.width === width && current.height === height ? current : { width, height });
    onLayout?.(event);
  };
  const path = useMemo(() => size.width > 0 && size.height > 0 ? createSmoothedPath(size.width, size.height, cornerRadius) : null, [cornerRadius, size.height, size.width]);
  // The MaskedView wraps the children, so the surface's row/alignment layout must be applied to it too.
  const contentLayout: ViewStyle = { flexDirection: flattenedStyle.flexDirection, alignItems: flattenedStyle.alignItems, justifyContent: flattenedStyle.justifyContent, gap: flattenedStyle.gap };
  // Keep a native rounded fill behind the Skia path while MaskedView/Canvas lays out.
  const surfaceStyle: ViewStyle = {
    ...flattenedStyle,
    backgroundColor: fill ?? 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    // Keep the native fill behind the shared smoothed path while it is being drawn.
    borderRadius: cornerRadius * (1 + CORNER_SMOOTHING),
  };
  // Android's Skia Canvas/MaskedView pair creates a TextureView per surface.
  // The Templates screen can mount dozens of them during navigation, where EGL
  // context detachment has been observed to leave the route blank. Use native
  // clipping and borders on Android; iOS continues to use the smoothed Skia
  // path below.
  if (Platform.OS === 'android') {
    return <View
      {...viewProps}
      ref={ref}
      onLayout={handleLayout}
      style={[styles.root, surfaceStyle, { backgroundColor: 'transparent', borderRadius: cornerRadius, overflow: 'hidden' }]}
    >
      <SvgSquircleFill width={size.width} height={size.height} radius={cornerRadius} fill={fill ? String(fill) : undefined} stroke={stroke ? String(stroke) : undefined} strokeWidth={strokeWidth} />
      {children}
    </View>;
  }
  // Skia's iOS Metal layer truncates fractional point dimensions; leave transparent room beyond the exact path bounds.
  const canvasStyle: ViewStyle = { position: 'absolute', top: 0, left: 0, width: Math.ceil(size.width), height: Math.ceil(size.height) };

  return (
    <View {...viewProps} ref={ref} onLayout={handleLayout} style={[styles.root, surfaceStyle]}>
      {fill && path && <Canvas pointerEvents="none" style={canvasStyle}><Path path={path} color={String(fill)} /></Canvas>}
      {path && children != null ? (
        <MaskedView
          style={[styles.mask, contentLayout]}
          maskElement={<Canvas pointerEvents="none" style={canvasStyle}><Path path={path} color="white" /></Canvas>}
        >
          {children}
        </MaskedView>
      ) : children}
      {!!stroke && strokeWidth > 0 && path && <Canvas pointerEvents="none" style={canvasStyle}>
        <Group clip={path}><Path path={path} color={String(stroke)} style="stroke" strokeWidth={strokeWidth * 2} strokeJoin="round" /></Group>
      </Canvas>}
    </View>
  );
});

const styles = StyleSheet.create({ root: { position: 'relative' }, mask: { flex: 1 } });
