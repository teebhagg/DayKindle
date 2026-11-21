import { Platform } from 'react-native';

// iOS sheets use a fitted detent: 60%/90% left the sheet footer clipped with dead space below it.
export const SHEET_SNAP_POINTS: (string | number)[] = Platform.OS === 'ios' ? [600] : ['60%', '90%'];
export const TALL_SHEET_SNAP_POINTS: (string | number)[] = Platform.OS === 'ios' ? [640] : ['70%', '90%'];
