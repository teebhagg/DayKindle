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
  /** `secondary` is the tonal, borderless action; `destructive` is the soft red variant. */
  appearance?: 'prominent' | 'secondary' | 'destructive' | 'bordered' | 'plain' | 'custom';
  tintColor?: string;
  labelColor?: string;
  labelFontSize?: number;
  nativeHeight?: boolean;
  /** iOS-only SwiftUI styling for buttons positioned in a screen header. */
  iosHeaderStyle?: 'back' | 'action';
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};
