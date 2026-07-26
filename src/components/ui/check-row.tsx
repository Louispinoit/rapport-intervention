import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CheckRowProps = {
  label: string;
  checked: boolean;
  onPress?: () => void;
  /** Square when options stack up, round when one option replaces the others. */
  shape?: 'check' | 'radio';
  showDivider?: boolean;
  readOnly?: boolean;
};

const BOX = 22;

export function CheckRow({
  label,
  checked,
  onPress,
  shape = 'check',
  showDivider = true,
  readOnly = false,
}: CheckRowProps) {
  const theme = useTheme();
  const isRadio = shape === 'radio';

  return (
    <Pressable
      accessibilityRole={isRadio ? 'radio' : 'checkbox'}
      accessibilityState={{ checked, disabled: readOnly }}
      disabled={readOnly}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        showDivider && {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.backgroundSelected,
        },
        pressed && !readOnly && { backgroundColor: theme.accentSoft },
      ]}>
      <View
        style={[
          styles.box,
          isRadio && styles.boxRound,
          {
            borderColor: checked ? theme.accent : theme.textSecondary,
            backgroundColor: checked && !isRadio ? theme.accent : 'transparent',
          },
        ]}>
        {checked ? (
          isRadio ? (
            <View style={[styles.dot, { backgroundColor: theme.accent }]} />
          ) : (
            <ThemedText style={[styles.mark, { color: theme.accentForeground }]}>✓</ThemedText>
          )
        ) : null}
      </View>
      <ThemedText style={styles.label}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 52,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.sm,
  },
  box: {
    width: BOX,
    height: BOX,
    borderWidth: 2,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxRound: {
    borderRadius: BOX / 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  mark: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  label: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
});
