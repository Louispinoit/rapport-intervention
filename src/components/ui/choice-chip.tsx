import { Pressable, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChoiceChipProps = {
  label: string;
  onPress?: () => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ChoiceChip({
  label,
  onPress,
  selected = false,
  style,
}: ChoiceChipProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: selected ? theme.accent : theme.background,
          borderColor: selected ? theme.accent : theme.backgroundSelected,
          opacity: pressed ? 0.72 : 1,
        },
        style,
      ]}>
      <ThemedText
        style={{
          color: selected ? theme.accentForeground : theme.text,
          fontWeight: selected ? '700' : '500',
          fontSize: 14,
          lineHeight: 20,
        }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: 9,
  },
});
