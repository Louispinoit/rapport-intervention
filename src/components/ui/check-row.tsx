import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { CheckIcon } from '@/components/ui/icons';
import { FontFamily, Motion, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { tickHaptic } from '@/lib/haptics';

type CheckRowProps = {
  label: string;
  checked: boolean;
  onPress?: () => void;
  /** Square when options stack up, round when one option replaces the others. */
  shape?: 'check' | 'radio';
  showDivider?: boolean;
  readOnly?: boolean;
};

const BOX = 24;

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

  if (readOnly) {
    // A saved report only lists what was ticked, so a box would be noise.
    return (
      <View style={[styles.row, showDivider && dividerStyle(theme.line)]}>
        <View style={[styles.readMark, { backgroundColor: theme.accentSoft }]}>
          <CheckIcon color={theme.accent} size={14} />
        </View>
        <ThemedText style={styles.label}>{label}</ThemedText>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole={isRadio ? 'radio' : 'checkbox'}
      accessibilityState={{ checked }}
      onPress={() => {
        tickHaptic();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.row,
        showDivider && dividerStyle(theme.line),
        pressed && { backgroundColor: theme.backgroundSelected },
      ]}>
      <Animated.View
        style={[
          styles.box,
          isRadio && styles.boxRound,
          {
            borderColor: checked ? theme.accent : theme.lineStrong,
            backgroundColor: checked && !isRadio ? theme.accent : theme.backgroundElement,
            transitionProperty: ['backgroundColor', 'borderColor'],
            transitionDuration: Motion.state,
            transitionTimingFunction: 'ease-out',
          },
        ]}>
        <Animated.View
          style={{
            opacity: checked ? 1 : 0,
            transform: [{ scale: checked ? 1 : 0.6 }],
            transitionProperty: ['opacity', 'transform'],
            transitionDuration: Motion.state,
            transitionTimingFunction: 'ease-out',
          }}>
          {isRadio ? (
            <View style={[styles.dot, { backgroundColor: theme.accent }]} />
          ) : (
            <CheckIcon color={theme.accentForeground} size={16} />
          )}
        </Animated.View>
      </Animated.View>
      <ThemedText style={styles.label}>{label}</ThemedText>
    </Pressable>
  );
}

function dividerStyle(color: string) {
  return { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color };
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 56,
    paddingVertical: 10,
    paddingHorizontal: Spacing.one,
  },
  box: {
    width: BOX,
    height: BOX,
    borderWidth: 1.5,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxRound: {
    borderRadius: BOX / 2,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  readMark: {
    width: BOX,
    height: BOX,
    borderRadius: BOX / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 16,
    lineHeight: 22,
  },
});
