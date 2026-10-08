import { Colors, type AppTheme } from '@/constants/theme';
import { StyleSheet, useColorScheme } from 'react-native';
import type { TToastColors, TToastThemeMode } from './Toast.types';

function toastColors(theme: AppTheme): TToastColors {
  return {
    surface: theme.surface, text: theme.ink, secondaryText: theme.muted,
    border: theme.line, close: theme.muted, shadow: theme.shadow,
    variants: {
      default: { accent: theme.green, tint: theme.lightGreen, glyph: '•' },
      success: { accent: theme.success, tint: theme.successBackground, glyph: '✓' },
      error: { accent: theme.error, tint: theme.errorBackground, glyph: '!' },
      warning: { accent: theme.warning, tint: theme.warningBackground, glyph: '!' },
      info: { accent: theme.info, tint: theme.infoBackground, glyph: 'i' },
    },
  };
}
export const lightColors = toastColors(Colors.light);
export const darkColors = toastColors(Colors.dark);

export function useToastTheme(theme: TToastThemeMode = 'system'): TToastColors {
  const systemTheme = useColorScheme();
  return theme === 'dark' || (theme === 'system' && systemTheme === 'dark')
    ? darkColors
    : lightColors;
}

export function createToastStyles(colors: TToastColors) {
  return StyleSheet.create({
    viewport: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 50,
      paddingHorizontal: 18,
      gap: 10,
    },
    topViewport: {
      top: 0,
    },
    bottomViewport: {
      bottom: 0,
    },
    toast: {
      width: '100%',
      maxWidth: 520,
      minHeight: 68,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingLeft: 13,
      paddingRight: 10,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 7,
    },
    toastSurface: {
      borderWidth: StyleSheet.hairlineWidth,
    },
    icon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconText: {
      fontFamily: 'Satoshi',
      fontSize: 17,
      lineHeight: 21,
      fontWeight: '700',
    },
    copy: {
      flex: 1,
      gap: 2,
      paddingVertical: 2,
    },
    title: {
      fontFamily: 'Satoshi',
      fontSize: 13.5,
      lineHeight: 18,
      fontWeight: '700',
    },
    description: {
      fontFamily: 'Satoshi',
      fontSize: 11.5,
      lineHeight: 16,
    },
    action: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    actionText: {
      fontFamily: 'Satoshi',
      fontSize: 12,
      fontWeight: '700',
    },
    close: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeText: {
      fontFamily: 'Satoshi',
      fontSize: 22,
      lineHeight: 26,
      fontWeight: '400',
    },
  });
}
