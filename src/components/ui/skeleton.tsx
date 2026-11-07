import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const pulse = {
  from: { opacity: 1 },
  to: { opacity: 0.45 },
};

/** Placeholder rows shaped like the report rows they stand in for. */
export function SkeletonRows({ count = 3 }: { count?: number }) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();

  return (
    <Animated.View
      accessibilityLabel="Chargement des rapports"
      style={
        reducedMotion
          ? null
          : {
              animationName: pulse,
              animationDuration: 900,
              animationIterationCount: 'infinite',
              animationDirection: 'alternate',
              animationTimingFunction: 'ease-in-out',
            }
      }>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={[
            styles.row,
            index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
          ]}>
          <View style={[styles.stub, { backgroundColor: theme.backgroundSelected }]} />
          <View style={styles.lines}>
            <View style={[styles.line, { width: '58%', backgroundColor: theme.backgroundSelected }]} />
            <View style={[styles.lineSmall, { width: '36%', backgroundColor: theme.backgroundSelected }]} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 68,
    paddingVertical: 12,
  },
  stub: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
  },
  lines: {
    flex: 1,
    gap: 8,
  },
  line: {
    height: 14,
    borderRadius: 7,
  },
  lineSmall: {
    height: 10,
    borderRadius: 5,
  },
});
