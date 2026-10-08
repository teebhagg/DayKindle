import type { AppTheme } from '@/constants/theme';

export type FeedbackSeverity = 'info' | 'success' | 'warning' | 'error';
export function feedbackTone(theme: AppTheme, severity: FeedbackSeverity) {
  return { color: theme[severity], backgroundColor: theme[`${severity}Background`] };
}
