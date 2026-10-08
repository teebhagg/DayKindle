import { forwardRef, useContext } from 'react';
import { StyleSheet, Text, TextInput, View, useWindowDimensions, type TextInputProps } from 'react-native';
import { colorWithOpacity } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { EXPRESSIVE_FONT_SIZE_MULTIPLIER, textStyleForVisualStyle, VisualStyleContext } from '../features/home/visual-style-context';

type AppTextInputProps = TextInputProps & { label?: string; error?: string; hideLabel?: boolean; borderless?: boolean };

export const AppTextInput = forwardRef<TextInput, AppTextInputProps>(function AppTextInput({ label, error, hideLabel = false, borderless = false, ...props }, ref) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const visualStyle = useContext(VisualStyleContext);
  const flatStyle = StyleSheet.flatten(props.style);
  const fieldHeight = typeof flatStyle?.height === 'number' ? flatStyle.height : typeof flatStyle?.minHeight === 'number' ? flatStyle.minHeight : 44;
  const fieldLabel = hideLabel ? undefined : label ?? props.accessibilityLabel;
  const scale = visualStyle === 'expressive' ? EXPRESSIVE_FONT_SIZE_MULTIPLIER : 1;
  const fieldStyle = {
    width: flatStyle?.width ?? (flatStyle?.flex ? undefined : '100%'),
    flex: flatStyle?.flex,
    flexGrow: flatStyle?.flexGrow,
    flexShrink: flatStyle?.flexShrink,
    alignSelf: 'stretch' as const,
    minHeight: Math.max(44, fieldHeight) * Math.max(1, fontScale),
    ...(!fieldLabel && flatStyle?.marginTop !== undefined ? { marginTop: flatStyle.marginTop } : {}),
    ...(!fieldLabel && flatStyle?.marginBottom !== undefined ? { marginBottom: flatStyle.marginBottom } : {}),
    backgroundColor: borderless ? 'transparent' : theme.surface,
    borderColor: borderless ? 'transparent' : error ? theme.error : theme.line,
    borderWidth: borderless ? 0 : 1,
    borderRadius: borderless ? 0 : 17,
    ...(borderless ? {} : { borderCurve: 'continuous' as const }),
  };
  const input = <View style={fieldStyle}>
    <TextInput {...props} ref={ref} placeholderTextColor={colorWithOpacity(theme.ink, 0.5)} selectionColor={theme.green}
    style={[{ color: theme.ink }, props.style,
      { marginTop: 0, marginBottom: 0, width: '100%', flex: 1 },
      { fontSize: (flatStyle?.fontSize ?? 16) * scale, lineHeight: (flatStyle?.lineHeight ?? 24) * scale },
      textStyleForVisualStyle(visualStyle),
      { height: undefined, minHeight: Math.max(44, fieldHeight) * Math.max(1, fontScale) },
      { width: '100%', flex: 1, backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 0, borderRadius: 0 },
    ]} />
  </View>;
  if (!fieldLabel && !error) return input;
  return <View style={{ minWidth: 0, flex: flatStyle?.flex, flexGrow: flatStyle?.flexGrow, flexShrink: flatStyle?.flexShrink, width: flatStyle?.width, marginTop: flatStyle?.marginTop, marginBottom: flatStyle?.marginBottom ?? 12, gap: 6 }}>
    {fieldLabel ? <Text style={[{ color: theme.muted, fontSize: 13, lineHeight: 19 }, textStyleForVisualStyle(visualStyle)]}>{fieldLabel}</Text> : null}
    {input}
    {error ? <Text accessibilityRole="alert" style={[{ color: theme.error, fontSize: 13, lineHeight: 19 }, textStyleForVisualStyle(visualStyle)]}>{error}</Text> : null}
  </View>;
});
