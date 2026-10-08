import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useTheme } from './use-theme';
import type { AppTheme } from '../constants/theme';

function applyContinuousCorners<T>(value: T): T {
  if (Platform.OS !== 'ios' || value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(applyContinuousCorners) as T;

  const source = value as Record<string, unknown>;
  const result = Object.fromEntries(Object.entries(source).map(([key, child]) => [key, applyContinuousCorners(child)]));
  if (typeof source.borderRadius === 'number' && source.borderRadius >= 6 && source.borderRadius < 99) {
    result.borderCurve = 'continuous';
  }
  return result as T;
}

export function useThemedStyles<T>(factory: (theme: AppTheme) => T): T {
  const theme = useTheme();
  return useMemo(() => applyContinuousCorners(factory(theme)), [factory, theme]);
}
