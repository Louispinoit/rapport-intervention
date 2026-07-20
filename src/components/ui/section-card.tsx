import type { PropsWithChildren } from 'react';
import {
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SectionCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function SectionCard({ children, style }: SectionCardProps) {
  const theme = useTheme();

  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.card,
        {
          borderColor: theme.backgroundSelected,
          shadowColor: theme.text,
        },
        style,
      ]}>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.three,
    padding: 20,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 2,
  },
});
