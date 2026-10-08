import { useContext, type ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { EXPRESSIVE_FONT_SIZE_MULTIPLIER, textStyleForVisualStyle, VisualStyleContext } from './visual-style-context';

export function PageText({ children, style, display = false, preserveDisplaySize = false, numberOfLines }: { children: ReactNode; style?: StyleProp<TextStyle>; display?: boolean; preserveDisplaySize?: boolean; numberOfLines?: number }) {
  const colors = useTheme();
  const expressive = useContext(VisualStyleContext) === 'expressive';
  const flatStyle = StyleSheet.flatten(style);
  const scale = expressive ? (preserveDisplaySize ? (display ? 1.7 : 1.8 * 0.9) : display ? 1.7 * 0.9 : 1.2 * EXPRESSIVE_FONT_SIZE_MULTIPLIER) : 1;
  const scaledType = scale === 1 ? undefined : { fontSize: (flatStyle?.fontSize ?? 15.4) * scale, lineHeight: flatStyle?.lineHeight == null ? undefined : flatStyle.lineHeight * scale };

  return (
    <Text numberOfLines={numberOfLines} style={[{ color: colors.ink }, style, scaledType, textStyleForVisualStyle(expressive ? 'expressive' : 'formal')]}>
      {children}
    </Text>
  );
}
