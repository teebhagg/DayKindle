import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type TextLayoutLine, type TextStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { PageText } from './page-text';

/** Each line draws its strike over this long, and lines within one block draw one after another. */
export const STRIKE_LINE_MS = 320;
/** The subtitle starts drawing this long after the title begins. */
export const STRIKE_SUBTITLE_DELAY_MS = 100;

type StrikeLineProps = {
  line: TextLayoutLine;
  completed: boolean;
  /** When the line starts drawing as the task is completed. */
  startMs: number;
  /** When the line starts clearing when the task is marked incomplete (mirrors the draw order). */
  undoStartMs: number;
  color: string;
  reduceMotion: boolean;
};

function StrikeLine({ line, completed, startMs, undoStartMs, color, reduceMotion }: StrikeLineProps) {
  const progress = useSharedValue(completed ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      progress.value = completed ? 1 : 0;
      return;
    }
    progress.value = withDelay(completed ? startMs : undoStartMs, withTiming(completed ? 1 : 0, { duration: STRIKE_LINE_MS, easing: Easing.out(Easing.cubic) }));
  }, [completed, startMs, undoStartMs, reduceMotion, progress]);
  const strokeStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.stroke, { left: line.x, top: line.y + line.height / 2 - STROKE_HEIGHT / 2, width: line.width, backgroundColor: color }, strokeStyle]}
    />
  );
}

const STROKE_HEIGHT = 1.5;

type StrikeTextProps = {
  children: string;
  style?: StyleProp<TextStyle>;
  completed: boolean;
  color: string;
  reduceMotion: boolean;
  /** 0 for the title, `STRIKE_SUBTITLE_DELAY_MS` for the subtitle. */
  startDelayMs: number;
  /** The latest line start across the title and subtitle, so undo can reverse the draw order. */
  maxStartMs: number;
  onLineCount?: (count: number) => void;
};

/** Text with a strike drawn over every line, one line after another. */
export function StrikeText({ children, style, completed, color, reduceMotion, startDelayMs, maxStartMs, onLineCount }: StrikeTextProps) {
  const [lines, setLines] = useState<TextLayoutLine[]>([]);
  return (
    <View style={styles.wrap}>
      <PageText
        style={style}
        onTextLayout={(event) => {
          const next = event.nativeEvent.lines;
          setLines(next);
          onLineCount?.(next.length);
        }}
      >
        {children}
      </PageText>
      {lines.map((line, index) => {
        const startMs = startDelayMs + index * STRIKE_LINE_MS;
        return (
          <StrikeLine
            key={index}
            line={line}
            completed={completed}
            startMs={startMs}
            undoStartMs={Math.max(0, maxStartMs - startMs)}
            color={color}
            reduceMotion={reduceMotion}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start', maxWidth: '100%' },
  stroke: { position: 'absolute', height: STROKE_HEIGHT, borderRadius: 1, transformOrigin: 'left' },
});
