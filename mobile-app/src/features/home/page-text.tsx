import { useContext, type ReactNode } from 'react';
import { StyleSheet, Text, type NativeSyntheticEvent, type StyleProp, type TextLayoutEventData, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { EXPRESSIVE_FONT_SIZE_MULTIPLIER, headingFontFamilyForVisualStyle, textStyleForVisualStyle, VisualStyleContext } from './visual-style-context';

export function PageText({ children, style, display = false, heading = false, preserveDisplaySize = false, numberOfLines, selectable = false, onTextLayout }: { children: ReactNode; style?: StyleProp<TextStyle>; display?: boolean; heading?: boolean; preserveDisplaySize?: boolean; numberOfLines?: number; selectable?: boolean; onTextLayout?: (event: NativeSyntheticEvent<TextLayoutEventData>) => void }) {
  const colors = useTheme();
  const expressive = useContext(VisualStyleContext) === 'expressive';
  const flatStyle = StyleSheet.flatten(style);
  const scale = expressive ? (preserveDisplaySize ? (display ? 1.7 : 1.8 * 0.9) : display ? 1.7 * 0.9 : EXPRESSIVE_FONT_SIZE_MULTIPLIER) : 1;
  const scaledType = scale === 1 ? undefined : { fontSize: (flatStyle?.fontSize ?? 15.4) * scale, lineHeight: flatStyle?.lineHeight == null ? undefined : flatStyle.lineHeight * scale };

  return (
    <Text numberOfLines={numberOfLines} selectable={selectable} onTextLayout={onTextLayout} style={[{ color: colors.ink }, style, scaledType, textStyleForVisualStyle(expressive ? 'expressive' : 'formal'), { ...(heading ? { fontFamily: headingFontFamilyForVisualStyle(expressive ? 'expressive' : 'formal') } : {}), fontWeight: heading ? '600' : expressive ? '400' : '200' }]}>
      {children}
    </Text>
  );
}
