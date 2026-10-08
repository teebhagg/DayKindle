import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useContext } from 'react';
import { EXPRESSIVE_FONT_SIZE_MULTIPLIER, textStyleForVisualStyle, VisualStyleContext } from '../features/home/visual-style-context';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const visualStyle = useContext(VisualStyleContext);
  const typeStyle = {
    default: styles.default,
    title: styles.title,
    small: styles.small,
    smallBold: styles.smallBold,
    subtitle: styles.subtitle,
    link: styles.link,
    linkPrimary: styles.linkPrimary,
    code: styles.code,
  }[type];
  const flatStyle = StyleSheet.flatten([typeStyle, style]) as TextStyle;
  const scale = visualStyle === 'expressive' ? (type === 'title' ? 0.9 : EXPRESSIVE_FONT_SIZE_MULTIPLIER) : 1;
  const scaledTypography = scale === 1 ? undefined : {
    fontSize: (flatStyle.fontSize ?? 15.4) * scale,
    lineHeight: flatStyle.lineHeight == null ? undefined : flatStyle.lineHeight * scale,
  };

  return (
    <Text
      style={[
        { color: theme[themeColor ?? (type === 'linkPrimary' ? 'green' : 'text')] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
        scaledTypography,
        textStyleForVisualStyle(visualStyle),
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 15.4,
    lineHeight: 22,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 15.4,
    lineHeight: 22,
    fontWeight: 700,
  },
  default: {
    fontSize: 17.6,
    lineHeight: 26.4,
    fontWeight: 500,
  },
  title: {
    fontSize: 52.8,
    fontWeight: 600,
    lineHeight: 57.2,
  },
  subtitle: {
    fontSize: 35.2,
    lineHeight: 48.4,
    fontWeight: 600,
  },
  link: {
    lineHeight: 33,
    fontSize: 15.4,
  },
  linkPrimary: {
    lineHeight: 33,
    fontSize: 15.4,

  },
  code: {
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 13.2,
  },
});
