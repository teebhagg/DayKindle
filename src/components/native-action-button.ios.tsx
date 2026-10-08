import { useTheme } from '@/hooks/use-theme';
import { Children, isValidElement, useContext, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { Button, HStack, Host, RNHostView, Spacer, Text } from '@expo/ui/swift-ui';
import {
  accessibilityHint,
  accessibilityLabel,
  background,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  contentShape,
  disabled as nativeDisabled,
  font,
  foregroundStyle,
  frame,
  tint,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import type { NativeActionButtonProps } from './native-action-button.types';
import { AppIcon, type AppIconName } from './app-icon';
import {
  EXPRESSIVE_FONT_SIZE_MULTIPLIER,
  fontFamilyForVisualStyle,
  VisualStyleContext,
} from '../features/home/visual-style-context';

const buttonIconNames: Record<string, AppIconName> = {
  'arrow.clockwise': 'refresh',
  'arrow.right': 'arrow',
  'bell.badge': 'notification',
  calendar: 'calendar',
  'calendar.badge.clock': 'calendar',
  checkmark: 'check',
  'chevron.left': 'back',
  minus: 'minus',
  plus: 'add',
  trash: 'delete',
  xmark: 'close',
};

const numberValue = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;

function containsAppIcon(node: ReactNode): boolean {
  return Children.toArray(node).some((child) => {
    if (!isValidElement(child)) return false;
    if (child.type === AppIcon) return true;
    return containsAppIcon((child.props as { children?: ReactNode }).children);
  });
}

export default function NativeActionButton({
  label,
  systemImage,
  iconPlacement = 'trailing',
  onPress,
  disabled = false,
  accessibilityLabel: accessibleLabel,
  accessibilityHint: accessibleHint,
  width = 'content',
  appearance = 'prominent',
  tintColor,
  labelColor,
  labelFontSize,
  nativeHeight = false,
  style,
  children,
}: NativeActionButtonProps) {
  const palette = useTheme();
  const { fontScale } = useWindowDimensions();
  tintColor ??= palette.green;
  const visualStyle = useContext(VisualStyleContext);
  const selectedFontFamily = fontFamilyForVisualStyle(visualStyle);
  const layout = StyleSheet.flatten(style) ?? {};
  const fullWidth = width === 'full';
  const foregroundColor = labelColor ?? (appearance === 'prominent' ? palette.onAccent : tintColor);
  const defaultLabelFontSize = appearance === 'prominent' ? 15.4 : appearance === 'plain' ? 13.2 : 12.1;
  const selectedLabelFontSize = labelFontSize ?? defaultLabelFontSize;
  const expressiveFontScale = 1.2 * EXPRESSIVE_FONT_SIZE_MULTIPLIER;
  const customContentHasIcon = containsAppIcon(children);
  const fixedContentWidth = !fullWidth ? numberValue(layout.width) : undefined;
  const flexibleWidth = (numberValue(layout.flex) ?? 0) > 0;
  // A full-width native button still needs SwiftUI spacers when its RN wrapper
  // is flexed; without them the Host fills the row while the button content
  // keeps its intrinsic width and clips the label during footer transitions.
  const fillsParentWidth = fullWidth;
  const minWidth = numberValue(layout.minWidth);
  const maxWidth = numberValue(layout.maxWidth);
  const requestedHeight = numberValue(layout.height);
  const minimumHeight = nativeHeight ? undefined : numberValue(layout.minHeight) ?? (appearance === 'plain' ? 44 : 50);
  const buttonHeight = nativeHeight
    ? undefined
    : Math.max(44, requestedHeight ?? 0, minimumHeight ?? 0) * Math.max(1, fontScale);
  const nativeButtonStyle = appearance === 'prominent'
    ? 'borderedProminent'
    : appearance === 'bordered'
      ? 'bordered'
      : 'plain';

  const hostStyle: ViewStyle = {
    alignSelf: fullWidth || flexibleWidth ? 'stretch' : 'center',
    width: fillsParentWidth ? '100%' : fixedContentWidth,
    flex: flexibleWidth ? layout.flex : undefined,
    flexGrow: flexibleWidth ? layout.flexGrow : undefined,
    flexShrink: flexibleWidth ? layout.flexShrink : undefined,
    minWidth,
    maxWidth,
    minHeight: buttonHeight,
    height: buttonHeight,
    marginTop: layout.marginTop,
    marginBottom: layout.marginBottom,
    marginLeft: layout.marginLeft,
    marginRight: layout.marginRight,
    marginHorizontal: layout.marginHorizontal,
    marginVertical: layout.marginVertical,
    opacity: layout.opacity,
    zIndex: layout.zIndex,
  };

  const modifiers = [
    buttonStyle(nativeButtonStyle),
    buttonBorderShape('capsule'),
    controlSize(appearance === 'plain' ? 'regular' : 'large'),
    tint(tintColor),
    nativeDisabled(disabled),
    ...(accessibleLabel || label ? [accessibilityLabel(accessibleLabel ?? label)] : []),
    ...(accessibleHint ? [accessibilityHint(accessibleHint)] : []),
    frame({
      width: fixedContentWidth,
      minWidth,
      maxWidth: fillsParentWidth ? 10000 : maxWidth,
      minHeight: buttonHeight,
      height: buttonHeight,
    }),
    contentShape(shapes.rectangle()),
    ...(appearance === 'custom' ? [background(tintColor, shapes.capsule())] : []),
  ];

  return (
    <Host
      style={hostStyle}
      matchContents={{ horizontal: !fillsParentWidth && !flexibleWidth, vertical: nativeHeight }}
    >
      <Button onPress={onPress} modifiers={modifiers}>
        {children ? (
          <HStack alignment="center" spacing={12} modifiers={[contentShape(shapes.rectangle())]}>
            {fillsParentWidth ? <Spacer /> : null}
            {systemImage && iconPlacement === 'leading' && !customContentHasIcon ? (
              <RNHostView matchContents>
                <View style={styles.iconSlot}>
                  <AppIcon
                    name={buttonIconNames[systemImage] ?? 'sparkle'}
                    style={visualStyle}
                    size={18}
                    color={foregroundColor}
                  />
                </View>
              </RNHostView>
            ) : null}
            <RNHostView matchContents>
              <View style={styles.customContent}>{children}</View>
            </RNHostView>
            {systemImage && iconPlacement !== 'leading' && !customContentHasIcon ? (
              <RNHostView matchContents>
                <View style={styles.iconSlot}>
                  <AppIcon
                    name={buttonIconNames[systemImage] ?? 'sparkle'}
                    style={visualStyle}
                    size={18}
                    color={foregroundColor}
                  />
                </View>
              </RNHostView>
            ) : null}
            {fillsParentWidth ? <Spacer /> : null}
          </HStack>
        ) : (
          <HStack alignment="center" spacing={12} modifiers={[contentShape(shapes.rectangle())]}>
            {fillsParentWidth ? <Spacer /> : null}
            {systemImage && iconPlacement === 'leading' ? (
              <RNHostView matchContents>
                <View style={styles.iconSlot}>
                  <AppIcon
                    name={buttonIconNames[systemImage] ?? 'sparkle'}
                    style={visualStyle}
                    size={18}
                    color={foregroundColor}
                  />
                </View>
              </RNHostView>
            ) : null}
            {label ? (
              <Text
                modifiers={[
                  font({
                    family: selectedFontFamily,
                    size: visualStyle === 'expressive'
                      ? selectedLabelFontSize * expressiveFontScale
                      : selectedLabelFontSize,
                    weight: visualStyle === 'expressive' ? 'regular' : 'semibold',
                  }),
                  foregroundStyle(foregroundColor),
                ]}
              >
                {label}
              </Text>
            ) : null}
            {systemImage && iconPlacement !== 'leading' ? (
              <RNHostView matchContents>
                <View style={styles.iconSlot}>
                  <AppIcon
                    name={buttonIconNames[systemImage] ?? 'sparkle'}
                    style={visualStyle}
                    size={18}
                    color={foregroundColor}
                  />
                </View>
              </RNHostView>
            ) : null}
            {fillsParentWidth ? <Spacer /> : null}
          </HStack>
        )}
      </Button>
    </Host>
  );
}

const styles = StyleSheet.create({
  customContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  iconSlot: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
