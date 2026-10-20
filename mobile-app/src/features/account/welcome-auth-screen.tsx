import { SquircleSurface } from '@/components/squircle-surface';
import { SquircleCard, SquirclePressable } from '@/components/squircle-card';
import { useTheme } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { LayoutSpacing, Radius, type AppTheme } from '@/constants/theme';
import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { useContext, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppleAuthButton from './apple-auth-button';
import { authProviderLabelTypography } from './auth-provider-typography';
import { GoogleGlyph } from './google-glyph';
import { AppIcon } from '../../components/app-icon';
import { textStyleForVisualStyle, VisualStyleContext } from '../home/visual-style-context';

const WELCOME_GRADIENT_SHADER = `
uniform float2 resolution;
uniform float seed;
uniform float warp;
uniform float angle;
uniform float swirl;
uniform float bend;
uniform float aspect;
uniform float grain;
uniform half3 c1;
uniform half3 c2;
uniform half3 c3;
uniform half3 c4;

float2x2 rot(float a) {
  float s = sin(a);
  float c = cos(a);
  return float2x2(c, -s, s, c);
}

float2 hash(float2 p) {
  p = float2(dot(p, float2(2127.1, 81.17)), dot(p, float2(1269.5, 283.37)));
  return fract(sin(p) * 43758.5453);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  float n = mix(
    mix(dot(-1.0 + 2.0 * hash(i + float2(0.0, 0.0)), f - float2(0.0, 0.0)),
        dot(-1.0 + 2.0 * hash(i + float2(1.0, 0.0)), f - float2(1.0, 0.0)), u.x),
    mix(dot(-1.0 + 2.0 * hash(i + float2(0.0, 1.0)), f - float2(0.0, 1.0)),
        dot(-1.0 + 2.0 * hash(i + float2(1.0, 1.0)), f - float2(1.0, 1.0)), u.x),
    u.y);
  return 0.5 + 0.5 * n;
}

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / resolution;
  float2 tuv = uv - 0.5;
  float degree = noise(float2(seed, tuv.x * tuv.y)) - 0.5;
  tuv.y *= 1.0 / aspect;
  tuv = tuv * rot(radians(angle + degree * swirl));
  tuv.y *= aspect;
  float frequency = 5.0;
  float amplitude = bend;
  tuv.x += sin(tuv.y * frequency + warp) / amplitude;
  tuv.y += sin(tuv.x * frequency * 1.5 + warp) / (amplitude * 0.5);
  float x = (tuv * rot(radians(-5.0))).x;
  half3 layer1 = mix(c3, c2, half(smoothstep(-0.3, 0.2, x)));
  half3 layer2 = mix(c4, c1, half(smoothstep(-0.3, 0.2, x)));
  half3 color = mix(layer1, layer2, half(smoothstep(0.5, -0.3, tuv.y)));
  color = color - half(length(hash(uv)) * grain);
  return half4(color, 1.0);
}
`;

function hexRgb(hex: string) {
  return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
}

type WelcomeAuthScreenProps = {
  accountConfigured: boolean;
  busy: boolean;
  skipBusy: boolean;
  onApple: () => void;
  onGoogle: () => void;
  onGuest: () => void;
  onSkip: () => void;
};

export function WelcomeAuthScreen({
  accountConfigured,
  busy,
  skipBusy,
  onApple,
  onGoogle,
  onGuest,
  onSkip,
}: WelcomeAuthScreenProps) {
  const palette = useTheme();   const styles = useThemedStyles(createStyles);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const visualStyle = useContext(VisualStyleContext);
  const panelHeight = Math.round(height * 0.58);
  const effect = useMemo(() => Skia.RuntimeEffect.Make(WELCOME_GRADIENT_SHADER), []);
  const uniforms = useMemo(() => ({
    resolution: [width, panelHeight],
    seed: 1.1,
    warp: 24,
    angle: -24,
    swirl: 24,
    bend: 3.5,
    aspect: 1.7,
    grain: 0.0882,
    c1: hexRgb(palette.hero),
    c2: hexRgb(palette.green),
    c3: hexRgb(palette.lightGreen),
    c4: hexRgb(palette.hero),
  }), [panelHeight, width, palette]);
  return (
    <View style={styles.container}>
      <SquircleSurface style={[styles.gradientPanel, { height: panelHeight }]}>
        {effect ? <Canvas style={StyleSheet.absoluteFill}><Fill><Shader source={effect} uniforms={uniforms} /></Fill></Canvas> : null}
      </SquircleSurface>
      <SquircleCard style={styles.sheet}>
        <ScrollView
          contentContainerStyle={[styles.sheetContent, {
            paddingTop: Math.max(0, insets.top - insets.bottom * 0.2),
            paddingBottom: Math.max(insets.bottom, 18),
          }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Text style={[styles.title, textStyleForVisualStyle(visualStyle)]}>Plan your day</Text>
          <Text style={[styles.subtitle, textStyleForVisualStyle(visualStyle)]}>Start on this device, or sign in and choose whether to sync.</Text>

          <View style={styles.actions}>
            <AppleAuthButton onPress={onApple} disabled={busy || !accountConfigured} />
            <SquirclePressable
              onPress={onGoogle}
              disabled={busy || !accountConfigured}
              style={({ pressed }) => [styles.action, styles.actionSecondary, pressed && !busy && accountConfigured && styles.actionSecondaryPressed, (!accountConfigured || busy) && styles.actionDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              <View style={styles.actionInner}><GoogleGlyph /><Text style={[styles.actionLabelSecondary, authProviderLabelTypography(visualStyle), textStyleForVisualStyle(visualStyle)]}>{busy ? 'Connecting…' : 'Continue with Google'}</Text></View>
            </SquirclePressable>
            <SquirclePressable
              onPress={onGuest}
              disabled={busy}
              style={({ pressed }) => [styles.action, styles.actionSecondary, pressed && !busy && styles.actionSecondaryPressed, busy && styles.actionDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Continue as guest"
            >
              <View style={styles.actionInner}>
                <AppIcon name="profile" size={18} color={palette.ink} />
                <Text style={[styles.actionLabelSecondary, authProviderLabelTypography(visualStyle), textStyleForVisualStyle(visualStyle)]}>{busy ? 'Please wait…' : 'Continue as Guest'}</Text>
              </View>
            </SquirclePressable>
          </View>

          {!accountConfigured ? <Text style={[styles.privacyNote, textStyleForVisualStyle(visualStyle)]}>Guest mode is ready. Account sign-in is not configured on this build.</Text> : <Text style={[styles.privacyNote, textStyleForVisualStyle(visualStyle)]}>Guest plans stay on this device. Sync is your choice.</Text>}
        </ScrollView>
      </SquircleCard>
      <SquirclePressable
        onPress={onSkip}
        disabled={busy || skipBusy}
        style={({ pressed }) => [styles.skipButton, pressed && !busy && !skipBusy && styles.skipPressed, (busy || skipBusy) && styles.actionDisabled, { top: insets.top + 10 }]}
        accessibilityRole="button"
        accessibilityLabel="Skip account setup and start as a guest"
      >
        <Text style={[styles.skipText, textStyleForVisualStyle(visualStyle)]}>{skipBusy ? 'Starting' : 'Use Guest'}</Text>
        <AppIcon name="arrow" size={16} color={palette.ink} />
      </SquirclePressable>
    </View>
  );
}

const createStyles = (palette: AppTheme) => {   return StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: palette.surface },
  gradientPanel: { width: '100%', overflow: 'hidden', backgroundColor: palette.hero },
  sheet: { flex: 1, marginTop: -34, overflow: 'hidden', backgroundColor: palette.surface },
  sheetContent: { flexGrow: 1, alignItems: 'center', paddingHorizontal: LayoutSpacing.screenInset },
  title: { color: palette.ink, fontFamily: 'Satoshi', fontSize: 20, fontWeight: '700', lineHeight: 26, letterSpacing: -0.45, textAlign: 'center' },
  subtitle: { marginTop: 7, color: palette.muted, fontFamily: 'Satoshi', fontSize: 15.5, fontWeight: '400', lineHeight: 21, letterSpacing: -0.2, textAlign: 'center' },
  actions: { width: '100%', gap: LayoutSpacing.related, marginTop: LayoutSpacing.section },
  action: { width: '100%', height: 56, borderRadius: Radius.pill, overflow: 'hidden' },
  actionInner: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18 },
  actionSecondary: { backgroundColor: palette.lightGreen },
  actionSecondaryPressed: { backgroundColor: palette.lightGreen },
  actionLabelSecondary: { color: palette.ink },
  actionDisabled: { opacity: 0.55 },
  privacyNote: { marginTop: 15, color: palette.muted, fontFamily: 'Satoshi', fontSize: 11, lineHeight: 16, textAlign: 'center' },
  skipButton: { position: 'absolute', zIndex: 10, right: 22, minWidth: 80, minHeight: 44, paddingHorizontal: 14, borderRadius: 999, backgroundColor: palette.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  skipPressed: { backgroundColor: palette.surface },
  skipText: { color: palette.ink, fontFamily: 'Satoshi', fontSize: 13, fontWeight: '600' },
}); };
