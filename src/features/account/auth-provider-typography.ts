import type { VisualStyle } from '../home/home-session';
import { EXPRESSIVE_FONT_SIZE_MULTIPLIER, textStyleForVisualStyle } from '../home/visual-style-context';

export function authProviderLabelTypography(visualStyle: VisualStyle, baseFontSize = 16) {
  const expressive = visualStyle === 'expressive';
  return {
    fontSize: baseFontSize * (expressive ? 1.2 * EXPRESSIVE_FONT_SIZE_MULTIPLIER : 1),
    fontWeight: expressive ? '400' as const : '600' as const,
    letterSpacing: expressive ? 0 : -0.35,
    ...textStyleForVisualStyle(visualStyle),
  };
}
