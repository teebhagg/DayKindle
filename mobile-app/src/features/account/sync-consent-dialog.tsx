import { SquircleCard, SquirclePressable } from '@/components/squircle-card';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { LayoutSpacing, Radius, type AppTheme } from '@/constants/theme';
import { Modal, Platform, StyleSheet, Text, View } from 'react-native';

type SyncConsentDialogProps = {
  visible: boolean;
  onChoice: (sync: boolean) => void;
};

export function SyncConsentDialog({ visible, onChoice }: SyncConsentDialogProps) {
  const styles = useThemedStyles(createStyles);

  if (Platform.OS !== 'android') return null;

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={() => onChoice(false)}
    >
      <View style={styles.scrim} accessibilityViewIsModal>
        <SquircleCard style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">Sync your planner?</Text>
          <Text style={styles.body}>
            Choose whether to sync your planner to this account or keep it on this device. You can change this in Profile.
          </Text>
          <View style={styles.actions}>
            <SquirclePressable
              pill
              onPress={() => onChoice(false)}
              style={({ pressed }) => [styles.keepButton, pressed && styles.keepButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel="Keep on this device"
            >
              <Text style={styles.keepButtonText}>Keep on this device</Text>
            </SquirclePressable>
            <SquirclePressable
              pill
              onPress={() => onChoice(true)}
              style={({ pressed }) => [styles.syncButton, pressed && styles.syncButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel="Sync my planner"
            >
              <Text style={styles.syncButtonText}>Sync my planner</Text>
            </SquirclePressable>
          </View>
        </SquircleCard>
      </View>
    </Modal>
  );
}

const createStyles = (palette: AppTheme) => StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LayoutSpacing.section,
    backgroundColor: palette.scrim,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    padding: LayoutSpacing.section,
    borderRadius: Radius.cardLarge,
    backgroundColor: palette.surface,
    gap: LayoutSpacing.related,
  },
  title: {
    color: palette.ink,
    fontFamily: 'Satoshi',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  body: {
    color: palette.muted,
    fontFamily: 'Satoshi',
    fontSize: 14,
    lineHeight: 21,
  },
  actions: { gap: LayoutSpacing.control, marginTop: LayoutSpacing.control },
  keepButton: {
    minHeight: 50,
    paddingHorizontal: LayoutSpacing.group,
    borderRadius: Radius.pill,
    backgroundColor: palette.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepButtonPressed: { backgroundColor: palette.pressed },
  keepButtonText: { color: palette.green, fontFamily: 'Satoshi', fontSize: 14, fontWeight: '600' },
  syncButton: {
    minHeight: 50,
    paddingHorizontal: LayoutSpacing.group,
    borderRadius: Radius.pill,
    backgroundColor: palette.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonPressed: { backgroundColor: palette.actionPressed },
  syncButtonText: { color: palette.onAccent, fontFamily: 'Satoshi', fontSize: 14, fontWeight: '700' },
});
