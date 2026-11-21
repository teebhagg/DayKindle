import { forwardRef, useContext } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, useWindowDimensions, type TextInputProps } from 'react-native';
import { colorWithOpacity, ControlCornerRadius } from '@/constants/theme';
import { SquircleSurface } from './squircle-surface';
import { useTheme } from '@/hooks/use-theme';
import { EXPRESSIVE_FONT_SIZE_MULTIPLIER, textStyleForVisualStyle, VisualStyleContext } from '../features/home/visual-style-context';

type AppTextInputProps = TextInputProps & { label?: string; error?: string; hideLabel?: boolean; borderless?: boolean };

// Text fields share the squircle surface with the date picker so their corners match on iOS and Android.
const FieldSurface = SquircleSurface;
const LABELLED_IOS_TEXT_NUDGE = 3;

export const AppTextInput = forwardRef<TextInput, AppTextInputProps>(function AppTextInput({ label, error, hideLabel = false, borderless = false, ...props }, ref) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const visualStyle = useContext(VisualStyleContext);
  const flatStyle = StyleSheet.flatten(props.style);
  const fieldHeight = typeof flatStyle?.height === 'number' ? flatStyle.height : typeof flatStyle?.minHeight === 'number' ? flatStyle.minHeight : 44;
  const fieldLabel = hideLabel ? undefined : label ?? props.accessibilityLabel;
  const scale = visualStyle === 'expressive' ? EXPRESSIVE_FONT_SIZE_MULTIPLIER : 1;
  const fieldStyle = {
    justifyContent: 'center' as const,
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
    borderRadius: borderless ? 0 : ControlCornerRadius,
  };
  const textInput = <TextInput {...props} ref={ref} placeholderTextColor={colorWithOpacity(theme.ink, 0.5)} selectionColor={theme.green}
    style={[{ color: theme.ink }, props.style,
      { marginTop: 0, marginBottom: 0, width: '100%', flex: 1 },
      { fontSize: (flatStyle?.fontSize ?? 16) * scale, lineHeight: props.multiline ? (flatStyle?.lineHeight ?? 24) * scale : flatStyle?.lineHeight },
      textStyleForVisualStyle(visualStyle),
      // Pin single-line iOS fields to the inner box (outer height minus the 1pt border) so UITextField centers its text in the surface.
      props.multiline || Platform.OS !== 'ios' || borderless
        ? { height: undefined, minHeight: Math.max(44, fieldHeight) * Math.max(1, fontScale) }
        : { height: Math.max(44, fieldHeight) * Math.max(1, fontScale) - 2, minHeight: Math.max(44, fieldHeight) * Math.max(1, fontScale) - 2 },
      { width: '100%', flex: 1, backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 0, borderRadius: 0 },
      // Labelled single-line iOS fields measured ~2-3pt low inside their surface; nudge the text up (measured on simulator).
      Platform.OS === 'ios' && fieldLabel && !props.multiline && !borderless ? { transform: [{ translateY: -LABELLED_IOS_TEXT_NUDGE }] } : null,
    ]} />;
  const input = borderless
    ? <View style={{ ...fieldStyle, backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 0 }}>{textInput}</View>
    : <FieldSurface radius={ControlCornerRadius} style={fieldStyle}>{textInput}</FieldSurface>;
  if (!fieldLabel && !error) return input;
  return <View style={{ minWidth: 0, flex: flatStyle?.flex, flexGrow: flatStyle?.flexGrow, flexShrink: flatStyle?.flexShrink, width: flatStyle?.width, marginTop: flatStyle?.marginTop, marginBottom: flatStyle?.marginBottom ?? 12, gap: 6 }}>
    {fieldLabel ? <Text style={[{ color: theme.muted, fontSize: 13, lineHeight: 19 }, textStyleForVisualStyle(visualStyle)]}>{fieldLabel}</Text> : null}
    {input}
    {error ? <Text accessibilityRole="alert" style={[{ color: theme.error, fontSize: 13, lineHeight: 19 }, textStyleForVisualStyle(visualStyle)]}>{error}</Text> : null}
  </View>;
});
