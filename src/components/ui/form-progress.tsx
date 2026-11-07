import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Motion } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FormProgressProps = {
  steps: { label: string; done: boolean }[];
};

/**
 * A strip under the header that fills as the form is completed, so it is
 * obvious at a glance what is still missing before handing the phone over.
 */
export function FormProgress({ steps }: FormProgressProps) {
  const theme = useTheme();
  const done = steps.filter((step) => step.done).length;
  const complete = done === steps.length;
  const missing = steps.filter((step) => !step.done).map((step) => step.label);

  return (
    <View
      accessibilityLabel={
        complete
          ? 'Fiche complète'
          : `${done} étapes sur ${steps.length}. Reste : ${missing.join(', ')}`
      }
      accessible
      style={[styles.wrap, { backgroundColor: theme.background, borderBottomColor: theme.line }]}>
      <View style={styles.segments}>
        {steps.map((step) => (
          <Animated.View
            key={step.label}
            style={[
              styles.segment,
              {
                backgroundColor: step.done ? theme.accent : theme.backgroundSelected,
                transitionProperty: 'backgroundColor',
                transitionDuration: Motion.state + 60,
                transitionTimingFunction: 'ease-out',
              },
            ]}
          />
        ))}
      </View>
      <ThemedText
        numberOfLines={1}
        style={[styles.caption, { color: complete ? theme.accent : theme.textSecondary }]}>
        {complete ? 'Fiche complète' : `${done}/${steps.length} · reste ${missing[0].toLowerCase()}`}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segments: {
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  caption: {
    fontFamily: FontFamily.bodySemibold,
    fontSize: 12,
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
  },
});
