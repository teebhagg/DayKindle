import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import type { AppTheme } from '@/constants/theme';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Group,
  Path,
  Skia,
  usePathInterpolation,
} from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

const blobPathData = [
  'M 39 4 C 56 4 74 18 73 39 C 72 57 57 74 39 73 C 21 72 5 57 5 39 C 5 21 22 4 39 4 Z',
  'M 39 6 C 58 3 76 18 71 39 C 77 57 57 77 39 72 C 20 77 2 57 7 39 C 2 20 20 7 39 6 Z',
  'M 39 5 C 56 9 75 19 74 39 C 73 58 59 70 39 74 C 21 78 4 58 5 39 C 7 20 20 1 39 5 Z',
  'M 39 7 C 59 5 72 20 74 39 C 77 56 57 75 39 71 C 21 76 7 58 4 39 C 3 21 19 7 39 7 Z',
  'M 39 4 C 56 4 74 18 73 39 C 72 57 57 74 39 73 C 21 72 5 57 5 39 C 5 21 22 4 39 4 Z',
] as const;

function makeBlobPath(pathData: string) {
  const path = Skia.Path.MakeFromSVGString(pathData);
  if (!path) {
    throw new Error('Could not create the intro blob path.');
  }
  return path;
}

export function IntroSkiaBlob({ progress, outline = false }: { progress: SharedValue<number>; outline?: boolean }) {
  const palette = useTheme();   const styles = useThemedStyles(createStyles);
  const paths = useMemo(() => blobPathData.map(makeBlobPath), []);
  const path = usePathInterpolation(progress, [0, 1, 2, 3, 4], paths);
  return (
    <View pointerEvents="none" style={styles.container}>
      <Canvas style={StyleSheet.absoluteFill}>
        {outline ? (
          <Group transform={[{ scale: 108 / 78 }]}>
            <Path path={path} style="stroke" color={palette.line} strokeWidth={0.8} />
          </Group>
        ) : <Path path={path} color={palette.lightGreen} />}
      </Canvas>
    </View>
  );
}

const createStyles = (palette: AppTheme) => {   return StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
  },
}); };
