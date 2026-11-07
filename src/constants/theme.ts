import '@/global.css';

import { Platform } from 'react-native';
import { cubicBezier } from 'react-native-reanimated';

/**
 * Livery palette: the red of Marc's van, warm paper neutrals tinted toward it,
 * and ink rather than pure black. Red is kept for actions, selections and the
 * home livery, never for decoration.
 */
export const Colors = {
  light: {
    text: '#1C1413',
    textSecondary: '#6B5F5A',
    textTertiary: '#9A8D87',
    /** Paper: the screen itself. */
    background: '#F5F0EB',
    /** Sheet: panels and rows sitting on the paper. */
    backgroundElement: '#FFFCF9',
    /** Pressed rows, skeletons, inactive fills. */
    backgroundSelected: '#ECE4DE',
    /** Hairlines and field underlines. */
    line: '#E3D9D2',
    lineStrong: '#CDBFB7',
    accent: '#BA1E26',
    accentPressed: '#9C1820',
    accentSoft: '#F8E7E6',
    accentForeground: '#FFF9F6',
    /** The home header: the van's red, and the deeper red its mark is painted in. */
    livery: '#BA1E26',
    liveryShade: '#A81A22',
    /** Shadows tinted with the ink and the red, never plain black. */
    shadowCard: '0 1px 2px rgba(28, 20, 19, 0.05), 0 14px 32px -14px rgba(28, 20, 19, 0.16)',
    shadowAccent: '0 10px 22px -10px rgba(186, 30, 38, 0.55)',
  },
  dark: {
    text: '#F4EEEA',
    textSecondary: '#AB9C96',
    textTertiary: '#7D706B',
    background: '#141010',
    backgroundElement: '#1E1817',
    backgroundSelected: '#2A2220',
    line: '#2E2624',
    lineStrong: '#463A37',
    accent: '#E03440',
    accentPressed: '#C42A35',
    accentSoft: '#2C1517',
    accentForeground: '#FFF6F4',
    // Kept deep in the dark: a bright red slab would glare at night.
    livery: '#9E1A21',
    liveryShade: '#8C161D',
    shadowCard: '0 1px 2px rgba(0, 0, 0, 0.3), 0 14px 32px -14px rgba(0, 0, 0, 0.5)',
    shadowAccent: '0 10px 22px -10px rgba(0, 0, 0, 0.6)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Loaded in the root layout. Android ignores fontWeight on a custom family, so
 * every weight is its own family and styles never set fontWeight with these.
 */
export const FontFamily = {
  display: 'BarlowCondensed_700Bold',
  displayHeavy: 'BarlowCondensed_800ExtraBold',
  displaySemibold: 'BarlowCondensed_600SemiBold',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemibold: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 28,
  pill: 999,
} as const;

/** Strong ease-out for UI state changes; built-in curves are too weak. */
export const EaseOut = cubicBezier(0.23, 1, 0.32, 1);

export const Motion = {
  press: 120,
  state: 180,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 720;
