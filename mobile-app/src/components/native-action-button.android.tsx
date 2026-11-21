import { useTheme } from '@/hooks/use-theme';
import { Radius } from '@/constants/theme';
import { useContext } from 'react';
import { StyleSheet, Text } from 'react-native';
import { SquirclePressable, SquircleView } from './squircle-card';
import type { NativeActionButtonProps } from './native-action-button.types';
import { EXPRESSIVE_FONT_SIZE_MULTIPLIER, textStyleForVisualStyle, VisualStyleContext } from '../features/home/visual-style-context';

export default function NativeActionButton({
  label,
  onPress,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  width = 'content',
  style,
  children,
  tintColor,
  labelColor,
  appearance = 'prominent',
}: NativeActionButtonProps) {
  const theme = useTheme();
  const visualStyle = useContext(VisualStyleContext);
  const flattenedStyle = StyleSheet.flatten(style);
  const flexibleWidth = typeof flattenedStyle?.flex === 'number' && flattenedStyle.flex > 0;
  const minimumHeight = typeof flattenedStyle?.height === 'number' ? flattenedStyle.height : typeof flattenedStyle?.minHeight === 'number' ? flattenedStyle.minHeight : 44;
  const hasCustomBackground = typeof flattenedStyle?.backgroundColor === 'string';
  const defaultBackground = appearance === 'prominent'
    ? tintColor ?? theme.green
    : appearance === 'plain' || appearance === 'secondary'
      ? theme.lightGreen
      : appearance === 'destructive'
        ? theme.errorBackground
        : appearance === 'bordered'
          ? theme.surface
          : undefined;
  const defaultLabelColor = appearance === 'prominent'
    ? theme.onAccent
    : appearance === 'destructive'
      ? theme.error
      : tintColor ?? theme.green;
  return (
    <SquirclePressable
      collapsable={false}
      nativePill
      pointerEvents="box-only"
      hitSlop={8}
      pressRetentionOffset={{ top: 16, right: 16, bottom: 16, left: 16 }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          minHeight: 44,
          paddingHorizontal: 12,
          borderRadius: Radius.pill,
          backgroundColor: defaultBackground,
        },
        style,
        { height: undefined, minHeight: Math.max(44, minimumHeight) },
        pressed && (hasCustomBackground
          ? { opacity: 0.8, transform: [{ scale: 0.985 }] }
          : { backgroundColor: appearance === 'prominent' ? theme.actionPressed : theme.pressed, transform: [{ scale: 0.985 }] }),
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
        width === 'content' && (flexibleWidth
          ? { alignSelf: 'stretch', maxWidth: '100%' }
          : { alignSelf: 'center', width: flattenedStyle?.width ?? 'auto', maxWidth: '100%', flexGrow: 0 }),
        width === 'full' && { alignSelf: 'stretch', width: '100%' },
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
    >
      {children ?? <SquircleView pointerEvents="none"><Text style={[{ color: labelColor ?? defaultLabelColor,fontSize: visualStyle === 'expressive' ? 14 * EXPRESSIVE_FONT_SIZE_MULTIPLIER : undefined }, textStyleForVisualStyle(visualStyle)]}>{label}</Text></SquircleView>}
    </SquirclePressable>
  );
}
