import { useCallback, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../hooks/use-theme';
import { ProgressiveEdgeBlur } from './progressive-edge-blur';

type ProgressiveHorizontalScrollViewProps = Omit<ScrollViewProps, 'horizontal'> & {
  viewportStyle?: StyleProp<ViewStyle>;
  /** Keep native bottom sheets visually solid when they contain horizontal controls. */
  showEdgeFade?: boolean;
  edgeFadeOpacity?: number;
  surfaceColor?: string;
};

export function ProgressiveHorizontalScrollView({
  children,
  style,
  contentContainerStyle,
  viewportStyle,
  showEdgeFade = true,
  edgeFadeOpacity = 1,
  surfaceColor,
  onLayout,
  onContentSizeChange,
  onScroll,
  ...scrollProps
}: ProgressiveHorizontalScrollViewProps) {
  const theme = useTheme();
  const fadeColor = surfaceColor ?? theme.paper;
  const dimensions = useRef({ viewport: 0, content: 0, offset: 0 });
  const [visibleEdges, setVisibleEdges] = useState({ leading: false, trailing: false });

  const updateVisibleEdges = useCallback(() => {
    if (!showEdgeFade) return;
    const { viewport, content, offset } = dimensions.current;
    const hasOverflow = content > viewport + 1;
    const next = {
      leading: hasOverflow && offset > 1,
      trailing: hasOverflow && offset + viewport < content - 1,
    };
    setVisibleEdges((current) => current.leading === next.leading && current.trailing === next.trailing ? current : next);
  }, [showEdgeFade]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    dimensions.current.viewport = event.nativeEvent.layout.width;
    updateVisibleEdges();
    onLayout?.(event);
  }, [onLayout, updateVisibleEdges]);

  const handleContentSizeChange = useCallback((width: number, height: number) => {
    dimensions.current.content = width;
    updateVisibleEdges();
    onContentSizeChange?.(width, height);
  }, [onContentSizeChange, updateVisibleEdges]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    dimensions.current.offset = event.nativeEvent.contentOffset.x;
    updateVisibleEdges();
    onScroll?.(event);
  }, [onScroll, updateVisibleEdges]);

  return (
    <View style={[styles.viewport, viewportStyle]}>
      <ScrollView
        {...scrollProps}
        horizontal
        onLayout={handleLayout}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleScroll}
        scrollEventThrottle={scrollProps.scrollEventThrottle ?? 16}
        style={style}
        contentContainerStyle={[styles.content, contentContainerStyle]}
      >
        {children}
      </ScrollView>
      {showEdgeFade && visibleEdges.leading ? <ProgressiveEdgeBlur edge="left" surfaceColor={fadeColor} style={[styles.leadingFade, { opacity: edgeFadeOpacity }]} /> : null}
      {showEdgeFade && visibleEdges.trailing ? <ProgressiveEdgeBlur edge="right" surfaceColor={fadeColor} style={[styles.trailingFade, { opacity: edgeFadeOpacity }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { overflow: 'hidden', marginHorizontal: -22 },
  content: { paddingHorizontal: 22 },
  leadingFade: { width: 32, zIndex: 1 },
  trailingFade: { width: 32, zIndex: 1 },
});
