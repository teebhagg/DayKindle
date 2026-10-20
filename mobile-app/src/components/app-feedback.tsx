import { feedbackTone, type FeedbackSeverity } from './feedback-tone';
import { Text, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { AppIcon } from './app-icon';
import { useContext } from 'react';
import { textStyleForVisualStyle, VisualStyleContext } from '../features/home/visual-style-context';
import { Radius } from '@/constants/theme';
import { SquircleCard, SquirclePressable } from './squircle-card';

export type AppFeedback = {
  severity: FeedbackSeverity;
  message: string;
  action?: { label: string; onPress: () => void; disabled?: boolean };
};

export function Feedback({ severity, message, action }: AppFeedback) {
  const theme = useTheme();
  const visualStyle = useContext(VisualStyleContext);
  const { color, backgroundColor } = feedbackTone(theme, severity);
  return (
    <SquircleCard accessibilityLiveRegion={severity === 'error' ? 'assertive' : 'polite'} style={{ padding: 12, backgroundColor, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <AppIcon name={severity === 'success' ? 'check' : severity === 'error' ? 'close' : severity === 'info' ? 'cloud' : 'notification'} color={color} size={20} />
        <Text accessibilityRole={severity === 'error' ? 'alert' : 'text'} style={[{ color, flex: 1, fontSize: 15, lineHeight: 22 }, textStyleForVisualStyle(visualStyle)]}>{message}</Text>
      </View>
      {action ? <SquirclePressable pill disabled={action.disabled} accessibilityRole="button" accessibilityState={{ disabled: action.disabled }} onPress={action.onPress} style={({ pressed }) => ({ minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 14, borderRadius: Radius.pill, backgroundColor: pressed ? theme.pressed : theme.surface })}>
        <Text style={[{ color, fontSize: 15, fontWeight: '600' }, textStyleForVisualStyle(visualStyle)]}>{action.label}</Text>
      </SquirclePressable> : null}
    </SquircleCard>
  );
}
