import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SectionCard } from '@/components/ui/section-card';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FormSectionProps = PropsWithChildren<{
  number: string;
  title: string;
}>;

/**
 * A numbered part of the report, set like a printed intervention form: the
 * number and title on the paper, the content on its own sheet below.
 */
export function FormSection({ number, title, children }: FormSectionProps) {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText style={[styles.number, { color: theme.accent }]}>{number}</ThemedText>
        <ThemedText style={styles.title}>{title}</ThemedText>
      </View>
      <SectionCard>{children}</SectionCard>
    </View>
  );
}

/** Small spaced capitals naming a group of options inside a section. */
export function GroupLabel({ title, hint }: { title: string; hint?: string }) {
  const theme = useTheme();

  return (
    <View style={styles.groupLabel}>
      <ThemedText style={{ color: theme.textSecondary }} type="label">
        {title}
      </ThemedText>
      {hint ? (
        <ThemedText style={[styles.hint, { color: theme.textTertiary }]}>{hint}</ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingHorizontal: Spacing.one,
  },
  number: {
    fontFamily: FontFamily.displayHeavy,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  title: {
    flex: 1,
    fontFamily: FontFamily.display,
    fontSize: 22,
    lineHeight: 26,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  groupLabel: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
    paddingBottom: 2,
  },
  hint: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
  },
});
