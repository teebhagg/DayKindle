import { useTheme } from '@/hooks/use-theme';
import { StyleSheet, useWindowDimensions, type ViewStyle } from 'react-native';
import { Button, Host } from '@expo/ui/swift-ui';
import type { SFSymbol } from 'sf-symbols-typescript';
import {
  accessibilityHint,
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  contentShape,
  disabled as nativeDisabled,
  frame,
  font,
  labelStyle,
  padding,
  tint,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import { EXPRESSIVE_FONT_SIZE_MULTIPLIER, nativeFontFamilyForVisualStyle, VisualStyleContext } from '../features/home/visual-style-context';
import { useContext } from 'react';
import type { NativeActionButtonProps } from './native-action-button.types';

const numberValue = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;

export default function NativeActionButton({
  label,
  systemImage,
  onPress,
  disabled = false,
  accessibilityLabel: accessibleLabel,
  accessibilityHint: accessibleHint,
  width = 'content',
  appearance = 'prominent',
  tintColor,
  labelFontSize,
  nativeHeight = false,
  iosHeaderStyle,
  style,
}: NativeActionButtonProps) {
  const palette = useTheme();
  const visualStyle = useContext(VisualStyleContext);
  const { fontScale } = useWindowDimensions();
  tintColor ??= appearance === 'destructive' ? palette.error : palette.green;
  const layout = StyleSheet.flatten(style) as ViewStyle | undefined;
  const fullWidth = width === 'full';
  const fixedContentWidth = !fullWidth ? numberValue(layout?.width) : undefined;
  const flexibleWidth = (numberValue(layout?.flex) ?? 0) > 0;
  const fillsParentWidth = fullWidth;
  const minWidth = numberValue(layout?.minWidth);
  const maxWidth = numberValue(layout?.maxWidth);
  const requestedHeight = numberValue(layout?.height);
  const minimumHeight = nativeHeight ? undefined : numberValue(layout?.minHeight) ?? (appearance === 'plain' ? 44 : 50);
  const buttonHeight = iosHeaderStyle === 'back'
    ? 44
    : nativeHeight
    ? undefined
    : Math.max(44, requestedHeight ?? 0, minimumHeight ?? 0) * Math.max(1, fontScale);
  const nativeButtonStyle = iosHeaderStyle
    ? 'plain'
    : appearance === 'prominent'
    ? 'borderedProminent'
    : appearance === 'bordered' || appearance === 'secondary' || appearance === 'destructive'
      ? 'bordered'
      : 'plain';
  const accessibleName = accessibleLabel?.toLowerCase() ?? '';
  const isCloseButton = !label && !systemImage && accessibleName.startsWith('close');
  const fallbackIsBack = accessibleName.includes('previous introduction screen');
  const fallbackIsWelcome = accessibleName.includes('return to welcome screen');
  const fallbackLabel = label || (
    accessibleLabel === 'Skip this step' ? 'Skip' :
      fallbackIsBack ? 'Back' :
        fallbackIsWelcome ? 'Close' : undefined
  );
  const nativeLabel = iosHeaderStyle === 'back' ? '' : fallbackLabel;
  const nativeSystemImage = systemImage ?? (
    fallbackIsBack ? 'chevron.left' :
      fallbackIsWelcome || (iosHeaderStyle === 'back' && accessibleName.startsWith('close')) ? 'xmark' :
        iosHeaderStyle === 'back' ? 'chevron.left' : undefined
  );
  const nativeFontSize = (labelFontSize ?? (appearance === 'prominent' ? 15.4 : appearance === 'plain' ? 13.2 : 14))
    * (visualStyle === 'expressive' ? EXPRESSIVE_FONT_SIZE_MULTIPLIER : 1);

  const hostStyle: ViewStyle = {
    // Header back buttons center on the bar's vertical midline so they line up with the screen title.
    alignSelf: iosHeaderStyle === 'back' ? 'center' : fillsParentWidth || flexibleWidth ? 'stretch' : 'center',
    width: iosHeaderStyle === 'back' ? 44 : fillsParentWidth ? '100%' : fixedContentWidth,
    flex: flexibleWidth ? layout?.flex : undefined,
    flexGrow: flexibleWidth ? layout?.flexGrow : undefined,
    flexShrink: flexibleWidth ? layout?.flexShrink : undefined,
    minWidth,
    maxWidth,
    minHeight: iosHeaderStyle ? 44 : buttonHeight,
    height: iosHeaderStyle === 'back' ? 44 : buttonHeight,
    marginTop: layout?.marginTop,
    marginBottom: layout?.marginBottom,
    marginLeft: layout?.marginLeft,
    marginRight: layout?.marginRight,
    marginHorizontal: layout?.marginHorizontal,
    marginVertical: layout?.marginVertical,
    opacity: layout?.opacity,
    zIndex: layout?.zIndex,
  };

  const modifiers = [
    // Header buttons use SwiftUI's Liquid Glass style (iOS 26+) instead of a custom fill and stroke.
    buttonStyle(iosHeaderStyle ? 'glass' : nativeButtonStyle),
    // Let SwiftUI choose the platform's native shape for each button style.
    buttonBorderShape(iosHeaderStyle === 'back' ? 'circle' : iosHeaderStyle === 'action' ? 'capsule' : 'automatic'),
    controlSize(iosHeaderStyle || appearance !== 'plain' ? 'large' : 'regular'),
    tint(tintColor),
    frame({
      width: iosHeaderStyle === 'back' ? 44 : fixedContentWidth,
      minWidth,
      // Flexible buttons (flex in their style) stretch to their share of the row, like Android.
      maxWidth: fillsParentWidth || flexibleWidth ? 10000 : maxWidth,
      minHeight: iosHeaderStyle ? 44 : buttonHeight,
      height: iosHeaderStyle === 'back' ? 44 : buttonHeight,
    }),
    // Icon-only header buttons: without this, SwiftUI reserves space for the empty title and shifts the glyph off-center.
    ...(iosHeaderStyle === 'back' ? [labelStyle('iconOnly')] : []),
    ...(iosHeaderStyle === 'action' ? [padding({ horizontal: 16, vertical: 8 })] : []),
    font({ family: nativeFontFamilyForVisualStyle(visualStyle), size: nativeFontSize, weight: 'regular' }),
    nativeDisabled(disabled),
    ...(accessibleLabel || nativeLabel ? [accessibilityLabel(accessibleLabel ?? nativeLabel!)] : []),
    ...(accessibleHint ? [accessibilityHint(accessibleHint)] : []),
    contentShape(iosHeaderStyle === 'back' ? shapes.circle() : shapes.rectangle()),
  ];

  return (
    <Host
      style={hostStyle}
      matchContents={{ horizontal: !fillsParentWidth && !flexibleWidth && fixedContentWidth == null, vertical: nativeHeight }}
      ignoreSafeArea="container"
    >
      <Button
        label={nativeLabel}
        systemImage={nativeSystemImage as SFSymbol | undefined}
        role={isCloseButton ? 'close' : 'default'}
        onPress={onPress}
        modifiers={modifiers}
      />
    </Host>
  );
}
