import type { PropsWithChildren } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SectionCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

/**
 * A sheet of paper on the desk: lighter than the background, a hairline edge
 * and a wide, faint shadow tinted with the ink. boxShadow renders the same soft
 * shadow on Android (new architecture), unlike the hard grey of elevation.
 */
export function SectionCard({ children, style }: SectionCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.line,
          boxShadow: theme.shadowCard,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
});
