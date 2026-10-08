import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useContext, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TToastRecord, TToasterProps } from './Toast.types';
import { createToastStyles } from './toast.theme';
import { textStyleForVisualStyle, VisualStyleContext } from '../../features/home/visual-style-context';
import { SquircleCard } from '../squircle-card';

export function Toaster({ toasts, colors, offset, onDismiss }: TToasterProps) {
  const insets = useSafeAreaInsets();
  const visualStyle = useContext(VisualStyleContext);
  const textStyle = textStyleForVisualStyle(visualStyle);
  const styles = useMemo(() => createToastStyles(colors), [colors]);
  const topToasts = toasts.filter((item) => item.position === 'top');
  const bottomToasts = toasts.filter((item) => item.position === 'bottom');

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View
        pointerEvents="box-none"
        style={[styles.viewport, styles.topViewport, { paddingTop: insets.top + 12 }]}
      >
        {topToasts.map((item) => (
          <ToastItem key={item.id} toast={item} colors={colors} textStyle={textStyle} onDismiss={onDismiss} />
        ))}
      </View>
      <View
        pointerEvents="box-none"
        style={[styles.viewport, styles.bottomViewport, { paddingBottom: insets.bottom + offset }]}
      >
        {bottomToasts.map((item) => (
          <ToastItem key={item.id} toast={item} colors={colors} textStyle={textStyle} onDismiss={onDismiss} />
        ))}
      </View>
    </View>
  );
}

function ToastItem({
  toast,
  colors,
  textStyle,
  onDismiss,
}: {
  toast: TToastRecord;
  colors: TToasterProps['colors'];
  textStyle: ReturnType<typeof textStyleForVisualStyle>;
  onDismiss: TToasterProps['onDismiss'];
}) {
  const styles = useMemo(() => createToastStyles(colors), [colors]);
  const variant = colors.variants[toast.variant];
  const reduceMotion = useReducedMotion();
  const entering = reduceMotion ? FadeIn.duration(80) : toast.position === 'top'
    ? FadeInUp.duration(205).withInitialValues({ transform: [{ translateY: -12 }] })
    : FadeInDown.duration(205).withInitialValues({ transform: [{ translateY: 12 }] });
  const exiting = FadeOut.duration(155);

  return (
    <Animated.View
      entering={entering}
      exiting={exiting}
      layout={reduceMotion ? undefined : LinearTransition.duration(205)}
      style={styles.toast}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <SquircleCard radiusRatio={0.5} exactSquircle pointerEvents="none" style={[StyleSheet.absoluteFill, styles.toastSurface, { backgroundColor: colors.surface, borderColor: colors.border }]} />
      <View style={[styles.icon, { backgroundColor: variant.tint }]} accessible={false}>
          <Text style={[styles.iconText, { color: variant.accent }, textStyle]}>{variant.glyph}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.text }, textStyle]} >
          {toast.title}
        </Text>
        {toast.description ? (
          <Text style={[styles.description, { color: colors.secondaryText }, textStyle]} >
            {toast.description}
          </Text>
        ) : null}
      </View>
      {toast.action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={toast.action.label}
          hitSlop={8}
          onPress={() => {
            toast.action?.onPress();
            onDismiss(toast.id);
          }}
          style={styles.action}
        >
          <Text style={[styles.actionText, { color: variant.accent }, textStyle]}>{toast.action.label}</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
        hitSlop={8}
        onPress={() => onDismiss(toast.id)}
        style={styles.close}
      >
        <Text style={[styles.closeText, { color: colors.close }, textStyle]}>×</Text>
      </Pressable>
    </Animated.View>
  );
}
