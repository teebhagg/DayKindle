import { useMemo, useState } from 'react';
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { MaskedView } from '@expo/ui/community/masked-view';
import { Platform, StyleSheet, View, type LayoutChangeEvent, type ViewProps, type ViewStyle } from 'react-native';

type SquircleSurfaceProps = ViewProps & { radius?: number; color?: string; borderColor?: string; borderWidth?: number; exactSquircle?: boolean };
export const CARD_SQUIRCLE_RADIUS_RATIO = 0.1;

export function squircleRadiusForSize(width: number, height: number) {
  return Math.min(width, height) * CARD_SQUIRCLE_RADIUS_RATIO;
}

function createSquirclePath(width: number, height: number, radius: number) {
  const path = Skia.Path.Make();
  const r = Math.min(radius, width / 2, height / 2);
  const exponent = 4;
  const pointsPerCorner = 16;
  const corners = [
    { cx: width - r, cy: r, start: -Math.PI / 2, end: 0 },
    { cx: width - r, cy: height - r, start: 0, end: Math.PI / 2 },
    { cx: r, cy: height - r, start: Math.PI / 2, end: Math.PI },
    { cx: r, cy: r, start: Math.PI, end: Math.PI * 1.5 },
  ];
  corners.forEach(({ cx, cy, start, end }, cornerIndex) => {
    for (let index = 0; index <= pointsPerCorner; index += 1) {
      const angle = start + ((end - start) * index) / pointsPerCorner;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const x = cx + r * Math.sign(cos) * Math.pow(Math.abs(cos), 2 / exponent);
      const y = cy + r * Math.sign(sin) * Math.pow(Math.abs(sin), 2 / exponent);
      if (cornerIndex === 0 && index === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
  });
  path.close();
  return path;
}

/** Shared Reacticx-style squircle surface: Skia path geometry clipped by Expo's native MaskedView. */
export function SquircleSurface({ children, style, radius, color, borderColor, borderWidth, exactSquircle = false, onLayout, ...viewProps }: SquircleSurfaceProps) {
  const flattenedStyle = StyleSheet.flatten(style) ?? {};
  const [size, setSize] = useState({ width: 0, height: 0 });
  const fallbackRadius = typeof flattenedStyle.borderRadius === 'number' ? flattenedStyle.borderRadius : 22;
  const cornerRadius = radius ?? (size.width > 0 && size.height > 0 ? squircleRadiusForSize(size.width, size.height) : fallbackRadius);
  const fill = color ?? flattenedStyle.backgroundColor;
  const stroke = borderColor ?? flattenedStyle.borderColor;
  const strokeWidth = borderWidth ?? (typeof flattenedStyle.borderWidth === 'number' ? flattenedStyle.borderWidth : 0);
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) => current.width === width && current.height === height ? current : { width, height });
    onLayout?.(event);
  };
  const path = useMemo(() => size.width > 0 && size.height > 0 ? createSquirclePath(size.width, size.height, cornerRadius) : null, [cornerRadius, size.height, size.width]);

  if (Platform.OS === 'ios' && !exactSquircle) {
    const nativeStyle: ViewStyle = {
      ...flattenedStyle,
      backgroundColor: fill,
      borderColor: stroke,
      borderWidth: strokeWidth,
      borderRadius: cornerRadius,
      borderCurve: 'continuous',
    };
    return <View {...viewProps} onLayout={handleLayout} style={[styles.root, nativeStyle]}>{children}</View>;
  }

  const surfaceStyle: ViewStyle = { ...flattenedStyle, backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 0, borderRadius: 0 };
  // Skia's iOS Metal layer truncates fractional point dimensions; leave transparent room beyond the exact path bounds.
  const canvasStyle: ViewStyle = { position: 'absolute', top: 0, left: 0, width: Math.ceil(size.width), height: Math.ceil(size.height) };

  return (
    <View {...viewProps} onLayout={handleLayout} style={[styles.root, surfaceStyle]}>
      {fill && path && <Canvas pointerEvents="none" style={canvasStyle}><Path path={path} color={String(fill)} /></Canvas>}
      {path && children != null ? (
        <MaskedView
          style={styles.mask}
          maskElement={<Canvas pointerEvents="none" style={canvasStyle}><Path path={path} color="white" /></Canvas>}
        >
          {children}
        </MaskedView>
      ) : children}
      {!!stroke && strokeWidth > 0 && path && <Canvas pointerEvents="none" style={canvasStyle}>
        {/* Skia centers strokes on the path; clip a double-width stroke to keep the whole border inside the fill. */}
        <Group clip={path}>
          <Path path={path} color={String(stroke)} style="stroke" strokeWidth={strokeWidth * 2} strokeJoin="round" />
        </Group>
      </Canvas>}
    </View>
  );
}

const styles = StyleSheet.create({ root: { position: 'relative' }, mask: { flex: 1 } });
