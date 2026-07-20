import {
  Pressable,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PrimaryButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'solid' | 'secondary';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  title,
  onPress,
  variant = 'solid',
  disabled = false,
  style,
}: PrimaryButtonProps) {
  const theme = useTheme();
  const isSolid = variant === 'solid';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isSolid ? styles.solid : styles.secondary,
        {
          backgroundColor: isSolid ? theme.accent : theme.backgroundElement,
          borderColor: isSolid ? theme.accent : theme.backgroundSelected,
          opacity: pressed || disabled ? 0.72 : 1,
        },
        style,
      ]}>
      <ThemedText
        style={[
          styles.label,
          {
            color: isSolid ? theme.accentForeground : theme.textSecondary,
          },
        ]}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  solid: {
    minHeight: 54,
  },
  secondary: {
    minHeight: 48,
  },
  label: {
    textAlign: 'center',
    flexShrink: 1,
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 22,
  },
});
