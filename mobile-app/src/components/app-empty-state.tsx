import { platformCardRadius } from '@/constants/theme';
import { useContext } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { AppIcon, type AppIconName } from './app-icon';
import { SquircleCard, SquirclePressable } from './squircle-card';
import { CARD_SQUIRCLE_RADIUS_RATIO } from './squircle-surface';
import { EXPRESSIVE_FONT_SIZE_MULTIPLIER, VisualStyleContext, textStyleForVisualStyle } from '../features/home/visual-style-context';

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: AppIconName;
  layout?: 'row' | 'center';
  onPress?: () => void;
  actionLabel?: string;
  radiusRatio?: number;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({ title, description, icon = 'calendar', layout = 'center', onPress, actionLabel, radiusRatio = CARD_SQUIRCLE_RADIUS_RATIO, style }: EmptyStateProps) {
  const theme = useTheme();
  const visualStyle = useContext(VisualStyleContext);
  const scale = visualStyle === 'expressive' ? EXPRESSIVE_FONT_SIZE_MULTIPLIER : 1;
  const centered = layout === 'center';
  const content = <>
    <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: theme.warmSurface, alignItems: 'center', justifyContent: 'center' }}><AppIcon name={icon} style={visualStyle} size={21} color={theme.warmAccent} /></View>
    <View style={{ flex: centered ? undefined : 1, gap: 5 }}>
      <Text style={[{ color: theme.ink, fontSize: 18 * scale, lineHeight: 25 * scale, textAlign: centered ? 'center' : 'left' }, textStyleForVisualStyle(visualStyle)]}>{title}</Text>
      <Text style={[{ color: theme.muted, fontSize: 14 * scale, lineHeight: 21 * scale, textAlign: centered ? 'center' : 'left' }, textStyleForVisualStyle(visualStyle)]}>{description}</Text>
    </View>
    {onPress ? <AppIcon name="arrow" style={visualStyle} size={18} color={theme.green} /> : null}
  </>;
  const container: ViewStyle = { minHeight: 44, padding: centered ? 24 : 14, gap: 12, alignItems: 'center', flexDirection: centered ? 'column' : 'row', borderRadius: platformCardRadius(17.6), ...(centered ? {} : { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line }) };
  return onPress ? <SquirclePressable radiusRatio={radiusRatio} exactSquircle accessibilityRole="button" accessibilityLabel={actionLabel ?? title} onPress={onPress} style={({ pressed }) => [container, style, pressed && { backgroundColor: theme.pressed }]}>{content}</SquirclePressable> : <SquircleCard radiusRatio={radiusRatio} exactSquircle style={[container, style]}>{content}</SquircleCard>;
}
