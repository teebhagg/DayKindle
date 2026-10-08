import { useTheme } from '@/hooks/use-theme';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Image } from 'react-native';
import { useHomeSession } from '../../features/home/home-session';
import { EXPRESSIVE_FONT_SIZE_MULTIPLIER, nativeFontFamilyForVisualStyle } from '../../features/home/visual-style-context';

const TAB_ICON_SIZE = 23;
const nativeTabIconSource = (asset: number) => {
  const source = Image.resolveAssetSource(asset);
  if (!source) return asset;
  const sourcePixelWidth = source.width * source.scale;
  const sourcePixelHeight = source.height * source.scale;
  return {
    ...source,
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
    scale: Math.min(sourcePixelWidth, sourcePixelHeight) / TAB_ICON_SIZE,
  };
};

const tabIconsByStyle = {
  formal: {
    today: nativeTabIconSource(require('../../../assets/images/tab-icons/today-formal.png')),
    goals: nativeTabIconSource(require('../../../assets/images/tab-icons/goals-formal.png')),
    progress: nativeTabIconSource(require('../../../assets/images/tab-icons/progress-formal.png')),
    profile: nativeTabIconSource(require('../../../assets/images/tab-icons/profile-formal.png')),
  },
  expressive: {
    today: nativeTabIconSource(require('../../../assets/images/tab-icons/today-expressive.png')),
    goals: nativeTabIconSource(require('../../../assets/images/tab-icons/goals-expressive.png')),
    progress: nativeTabIconSource(require('../../../assets/images/tab-icons/progress-expressive.png')),
    profile: nativeTabIconSource(require('../../../assets/images/tab-icons/profile-expressive.png')),
  },
};
export default function TabsLayout() {
  const palette = useTheme();
  const { visualStyle } = useHomeSession();
  const tabIcons = tabIconsByStyle[visualStyle];
  const labelStyle = { fontFamily: nativeFontFamilyForVisualStyle(visualStyle), fontSize: visualStyle === 'expressive' ? 11 * EXPRESSIVE_FONT_SIZE_MULTIPLIER : 11 };
  return (
    <NativeTabs backgroundColor={palette.surface} iconColor={{ default: palette.muted, selected: palette.green }} labelStyle={{ default: { ...labelStyle, color: palette.muted }, selected: { ...labelStyle, color: palette.green } }} tintColor={palette.green} minimizeBehavior="never" blurEffect="systemChromeMaterial">
      <NativeTabs.Trigger name="index" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={tabIcons.today} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="goals" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Goals</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={tabIcons.goals} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={tabIcons.progress} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={tabIcons.profile} renderingMode="template" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
