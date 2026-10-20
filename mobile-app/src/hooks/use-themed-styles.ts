import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useTheme } from './use-theme';
import { normalizeCornerRadius, Radius, type AppTheme } from '../constants/theme';

function numericDimension(value: unknown) {
  return typeof value === 'number' ? value : undefined;
}

function applyDesignCorners<T>(value: T): T {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(applyDesignCorners) as T;

  const source = value as Record<string, unknown>;
  const result = Object.fromEntries(Object.entries(source).map(([key, child]) => [key, applyDesignCorners(child)]));
  const radius = source.borderRadius;
  if (typeof radius === 'number' && radius >= 6) {
    const width = numericDimension(source.width);
    const height = numericDimension(source.height);
    const isCircle = width != null && width === height && radius >= width / 2;
    const isPill = radius >= 99;
    const keepCircular = source.borderCurve === 'circular' || isCircle || isPill;

    if (isPill) {
      result.borderRadius = Radius.pill;
    } else if (!keepCircular) {
      result.borderRadius = normalizeCornerRadius(radius);
    }

    if (Platform.OS === 'ios') result.borderCurve = keepCircular ? 'circular' : 'continuous';
  }
  return result as T;
}

export function useThemedStyles<T>(factory: (theme: AppTheme) => T): T {
  const theme = useTheme();
  return useMemo(() => applyDesignCorners(factory(theme)), [factory, theme]);
}
