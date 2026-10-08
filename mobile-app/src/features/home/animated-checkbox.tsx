import { memo, useEffect } from 'react';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path, Rect, type PathProps } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const TICK_PATH = 'M8 16l5.5 5.5L24 10';
const TICK_LENGTH = 24;

type AnimatedCheckboxProps = {
  checked: boolean;
  color: string;
  size?: number;
  reduceMotion?: boolean | null;
};

function AnimatedCheckbox({ checked, color, size = 28, reduceMotion = false }: AnimatedCheckboxProps) {
  const progress = useSharedValue(checked ? 1 : 0);
  const strokeProps = useAnimatedProps<Pick<PathProps, 'strokeDashoffset' | 'opacity'>>(() => ({
    strokeDashoffset: TICK_LENGTH * (1 - progress.value),
    opacity: progress.value <= 0.01 ? 0 : 1,
  }));

  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, { duration: reduceMotion ? 0 : checked ? 290 : 230 });
  }, [checked, progress, reduceMotion]);

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" accessibilityElementsHidden>
      <Rect x={4.5} y={4.5} width={23} height={23} rx={7} fill="none" stroke={color} strokeWidth={1.7} />
      <AnimatedPath d={TICK_PATH} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={TICK_LENGTH} animatedProps={strokeProps} />
    </Svg>
  );
}

export default memo(AnimatedCheckbox);
