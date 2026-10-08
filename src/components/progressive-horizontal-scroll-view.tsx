import { ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';

type ProgressiveHorizontalScrollViewProps = Omit<ScrollViewProps, 'horizontal'> & {
  viewportStyle?: StyleProp<ViewStyle>;
};

export function ProgressiveHorizontalScrollView({
  children,
  style,
  contentContainerStyle,
  viewportStyle,
  ...scrollProps
}: ProgressiveHorizontalScrollViewProps) {
  return (
    <View style={[styles.viewport, viewportStyle]}>
      <ScrollView {...scrollProps} horizontal style={style} contentContainerStyle={[styles.content, contentContainerStyle]}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { overflow: 'hidden', marginHorizontal: -22 },
  content: { paddingHorizontal: 22 },
});
