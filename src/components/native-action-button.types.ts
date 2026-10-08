import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type NativeActionButtonProps = {
  label: string;
  systemImage?: string;
  iconPlacement?: 'leading' | 'trailing';
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  width?: 'content' | 'full';
  appearance?: 'prominent' | 'bordered' | 'plain' | 'custom';
  tintColor?: string;
  labelColor?: string;
  labelFontSize?: number;
  nativeHeight?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};
