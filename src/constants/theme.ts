import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#16100F',
    background: '#F3EFEC',
    backgroundElement: '#FDFAF8',
    backgroundSelected: '#DDD5CE',
    textSecondary: '#6A5F5A',
    accent: '#BA1E26',
    accentSoft: '#F5E4E5',
    accentForeground: '#FDFAF8',
  },
  dark: {
    text: '#F4F0ED',
    background: '#120D0C',
    backgroundElement: '#1E1614',
    backgroundSelected: '#2E2220',
    textSecondary: '#A8938C',
    accent: '#E03440',
    accentSoft: '#2A1213',
    accentForeground: '#F4F0ED',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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
  lg: 16,
  xl: 24,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
