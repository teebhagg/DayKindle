import { useTheme } from '@/hooks/use-theme';
import { useContext } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  const buttonHeight = typeof flattenedStyle?.height === 'number'
    ? flattenedStyle.height
    : typeof flattenedStyle?.minHeight === 'number' ? flattenedStyle.minHeight : 48;
  const rippleRadius = Math.max(18, Math.round(buttonHeight / 2));

  const minimumHeight = typeof flattenedStyle?.height === 'number' ? flattenedStyle.height : typeof flattenedStyle?.minHeight === 'number' ? flattenedStyle.minHeight : 44;
  return (
    <Pressable
      collapsable={false}
      pointerEvents="box-only"
      hitSlop={8}
      pressRetentionOffset={{ top: 16, right: 16, bottom: 16, left: 16 }}
      android_ripple={{ color: theme.pressed, radius: rippleRadius }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        { minHeight: 44, paddingHorizontal: 12, borderRadius: 16, backgroundColor: appearance === 'prominent' ? theme.green : undefined },
        style,
        { height: undefined, minHeight: Math.max(44, minimumHeight) },
        pressed && { backgroundColor: appearance === 'prominent' ? theme.actionPressed : theme.pressed },
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
        { overflow: 'hidden' },
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
      {children ?? <View pointerEvents="none"><Text style={[{ color: labelColor ?? (appearance === 'prominent' ? theme.onAccent : tintColor ?? theme.green), fontSize: visualStyle === 'expressive' ? 14 * EXPRESSIVE_FONT_SIZE_MULTIPLIER : undefined }, textStyleForVisualStyle(visualStyle)]}>{label}</Text></View>}
    </Pressable>
  );
}
