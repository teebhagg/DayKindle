import { useContext } from 'react';
import { Pressable, Platform, StyleSheet, Text, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';
import { VisualStyleContext } from '../home/visual-style-context';
import { authProviderLabelTypography } from './auth-provider-typography';

export default function AppleAuthButton({ onPress, disabled, labelFontSize = 16 }: { onPress: () => void; disabled: boolean; labelFontSize?: number }) {
  const visualStyle = useContext(VisualStyleContext);
  if (Platform.OS !== 'ios') return null;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, pressed && !disabled && styles.buttonPressed, disabled && styles.buttonDisabled]}
      accessibilityRole="button"
      accessibilityLabel="Sign in with Apple"
      accessibilityState={{ disabled }}
    >
      <View pointerEvents="none" style={styles.content}>
        <Svg width={18} height={18} viewBox="0 0 24 24" accessible={false}>
          <Path fill="#FFFFFF" d="M17.05 20.28c-.98.95-2.05.8-3.1.35-1.1-.46-2.1-.48-3.27 0-1.46.62-2.23.44-3.1-.35-4.98-5.1-4.25-12.86 1.2-13.17 1.32.07 2.25.73 3.13.78 1.3-.27 2.54-.95 3.92-.84 1.66.13 2.9.79 3.71 1.97-3.41 2.04-2.6 6.53.54 7.78-.62 1.63-1.42 3.25-2.96 4.49l-.07-.01zM12.03 6.2c-.15-2.42 1.8-4.43 4-4.63.3 2.79-2.5 4.89-4 4.63z" />
        </Svg>
        <Text style={[styles.label, authProviderLabelTypography(visualStyle, labelFontSize)]}>Sign in with Apple</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: '100%', height: 56, borderRadius: 28, backgroundColor: '#000000', overflow: 'hidden' },
  buttonPressed: { backgroundColor: '#1A1A1A' },
  buttonDisabled: { opacity: 0.6 },
  content: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18 },
  label: { color: '#FFFFFF' },
});
