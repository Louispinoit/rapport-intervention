import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ReportSummary } from '@/lib/report';

type ReportRowProps = {
  report: ReportSummary;
  onPress: () => void;
  showDivider?: boolean;
};

function formatUpdatedAt(value: string) {
  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(parsed);
}

export function ReportRow({ report, onPress, showDivider = true }: ReportRowProps) {
  const theme = useTheme();
  const savedAt = formatUpdatedAt(report.updatedAt);
  const title = `Intervention du ${report.interventionDate || savedAt}`;
  const details = report.interventionDate === savedAt ? '' : `Enregistré le ${savedAt}`;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        showDivider && {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.backgroundSelected,
        },
        pressed && { backgroundColor: theme.accentSoft },
      ]}>
      <View style={styles.main}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        {details ? (
          <ThemedText themeColor="textSecondary" style={styles.details}>
            {details}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText style={[styles.chevron, { color: theme.textSecondary }]}>›</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 60,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.sm,
  },
  main: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  details: {
    fontSize: 13,
    lineHeight: 18,
  },
  chevron: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '300',
  },
});
