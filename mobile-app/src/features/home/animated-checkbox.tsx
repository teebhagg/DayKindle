import { memo, useEffect, useMemo } from 'react';
import { Canvas, Group, Path, RoundedRect, Skia } from '@shopify/react-native-skia';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';

const TICK_PATH = 'M8 16l5.5 5.5L24 10';

type AnimatedCheckboxProps = {
  checked: boolean;
  color: string;
  size?: number;
  reduceMotion?: boolean | null;
};

function AnimatedCheckbox({ checked, color, size = 28, reduceMotion = false }: AnimatedCheckboxProps) {
  const progress = useSharedValue(checked ? 1 : 0);
  const tickPath = useMemo(() => Skia.Path.MakeFromSVGString(TICK_PATH), []);

  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, { duration: reduceMotion ? 0 : checked ? 210 : 160 });
  }, [checked, progress, reduceMotion]);

  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ width: size, height: size }}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        {/* The artwork is drawn on a 28-unit grid; scale it to the requested size so the outline is not clipped at the edge. */}
        <Group transform={[{ scale: size / 28 }]}>
          <RoundedRect
            rect={Skia.RRectXY(Skia.XYWHRect(4.5, 4.5, 23, 23), 7, 7)}
            color={color}
            style="stroke"
            strokeWidth={1.7}
          />
          {tickPath ? (
            <Path
              path={tickPath}
              color={color}
              style="stroke"
              strokeWidth={2.6}
              strokeCap="round"
              strokeJoin="round"
              start={0}
              end={progress}
            />
          ) : null}
        </Group>
      </Canvas>
    </View>
  );
}

export default memo(AnimatedCheckbox);
