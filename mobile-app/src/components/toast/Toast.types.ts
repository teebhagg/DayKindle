import type { ReactNode } from 'react';

export type TToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';
export type TToastPosition = 'top' | 'bottom';
export type TToastThemeMode = 'light' | 'dark' | 'system';

export interface TToastAction {
  label: string;
  onPress: () => void;
}

export interface TToastOptions {
  description?: string;
  duration?: number;
  position?: TToastPosition;
  action?: TToastAction;
}

export interface TToastRecord {
  id: string;
  title: string;
  variant: TToastVariant;
  description?: string;
  duration: number;
  position: TToastPosition;
  action?: TToastAction;
}

export interface TToastApi {
  show: (title: string, options?: TToastOptions) => string;
  success: (title: string, options?: TToastOptions) => string;
  error: (title: string, options?: TToastOptions) => string;
  warning: (title: string, options?: TToastOptions) => string;
  info: (title: string, options?: TToastOptions) => string;
  update: (id: string, title: string, options?: TToastOptions) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export interface IToastProvider {
  children: ReactNode;
  theme?: TToastThemeMode;
  position?: TToastPosition;
  duration?: number;
  offset?: number;
  maxVisible?: number;
}

export interface TToastColors {
  surface: string;
  text: string;
  secondaryText: string;
  border: string;
  close: string;
  shadow: string;
  variants: Record<TToastVariant, { accent: string; tint: string; glyph: string }>;
}

export interface TToasterProps {
  toasts: TToastRecord[];
  colors: TToastColors;
  offset: number;
  onDismiss: (id: string) => void;
}
