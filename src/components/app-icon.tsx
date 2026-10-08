import { useTheme } from '@/hooks/use-theme';
import { useContext } from 'react';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Path, Svg } from 'react-native-svg';
import {
  Activity01Icon,
  Add01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  BalanceScaleIcon,
  Brain01Icon,
  Briefcase01Icon,
  Calendar03Icon,
  Cancel01Icon,
  Clock01Icon,
  CloudIcon,
  Delete02Icon,
  HeartCheckIcon,
  Home01Icon,
  MinusSignIcon,
  Moon02Icon,
  Notification01Icon,
  Refresh01Icon,
  Search01Icon,
  SparklesIcon,
  Sun01Icon,
  Target01Icon,
  Tick01Icon,
  UserCircleIcon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons';
import type { VisualStyle } from '../features/home/home-session';
import expressiveIconPaths from './doodle-icon-paths.json';
import { VisualStyleContext } from '../features/home/visual-style-context';

const appIcons = {
  add: Add01Icon,
  arrow: ArrowRight01Icon,
  back: ArrowLeft01Icon,
  balance: BalanceScaleIcon,
  calendar: Calendar03Icon,
  check: Tick01Icon,
  clock: Clock01Icon,
  close: Cancel01Icon,
  cloud: CloudIcon,
  delete: Delete02Icon,
  fitness: Activity01Icon,
  focus: Brain01Icon,
  goals: Target01Icon,
  goal: Target01Icon,
  health: Activity01Icon,
  home: Home01Icon,
  mind: Brain01Icon,
  minus: MinusSignIcon,
  money: Wallet01Icon,
  notification: Notification01Icon,
  profile: UserCircleIcon,
  progress: Activity01Icon,
  refresh: Refresh01Icon,
  relationships: HeartCheckIcon,
  search: Search01Icon,
  sleep: Moon02Icon,
  sparkle: SparklesIcon,
  sun: Sun01Icon,
  today: Home01Icon,
  work: Briefcase01Icon,
} as const;

export type AppIconName = keyof typeof appIcons;

const ICON_STROKE_WIDTH = 1.8;

const handDrawnIconPaths = {
  ...expressiveIconPaths,
  close: ['M8 8 24 24M24 8 8 24', 'M9 9c2 3 4 4 7 7'],
  delete: [
    'M7 9h18M11 9V6h10v3M9 9l1.5 18h11L23 9M13 13v10M19 13v10',
    'M12 5.5c3-1 6-1 9 .1',
  ],
  minus: ['M7 16h18', 'M9 15.6c4 .7 9 .7 14 .1'],
  notification: [
    'M7 23c2-2 2.5-4.5 2.5-8 0-4 2.5-7 6.5-7s6.5 3 6.5 7c0 3.5.5 6 2.5 8H7ZM13 26c1.5 1 3.5 1 5 0',
    'M11 11c1.2-1.3 2.6-1.7 4.3-1.5',
  ],
  refresh: [
    'M25 11a10 10 0 0 0-17 0L5 14M5 9v5h5M7 21a10 10 0 0 0 17 0l3-3M27 23v-5h-5',
    'M9 11c4-5 10-5 14-2',
  ],
} satisfies Record<AppIconName, string[]>;

export function AppIcon({ name, style: requestedStyle, size = 20, color }: {
  name: AppIconName;
  /** Overrides the screen's selected icon and typography style for previews. */
  style?: VisualStyle;
  size?: number;
  color?: string;
}) {
  const palette = useTheme();
  color ??= palette.green;

  const contextStyle = useContext(VisualStyleContext);
  const visualStyle = requestedStyle ?? contextStyle;

  if (visualStyle === 'expressive') {
    const paths = handDrawnIconPaths[name];
    return (
      <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <Path d={paths[0]} stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
        {paths[1] ? <Path d={paths[1]} stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" opacity={0.62} /> : null}
      </Svg>
    );
  }

  return <HugeiconsIcon icon={appIcons[name]} size={size} color={color} strokeWidth={ICON_STROKE_WIDTH} />;
}

export const TAB_ICON_SIZE = 23;
