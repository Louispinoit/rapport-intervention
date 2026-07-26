import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ReportRow } from '@/components/ui/report-row';
import { SectionCard } from '@/components/ui/section-card';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { reportDate, type ReportSummary } from '@/lib/report';
import { deleteReportDraft, listReportDrafts } from '@/lib/report-store';

const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

type MonthGroup = {
  key: string;
  label: string;
  reports: ReportSummary[];
};

function groupByMonth(reports: ReportSummary[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();

  for (const report of reports) {
    const date = reportDate(report);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const group = groups.get(key);

    if (group) {
      group.reports.push(report);
    } else {
      groups.set(key, { key, label: monthFormatter.format(date), reports: [report] });
    }
  }

  return [...groups.values()];
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.accent : theme.backgroundElement,
          borderColor: selected ? theme.accent : theme.backgroundSelected,
          opacity: pressed ? 0.72 : 1,
        },
      ]}>
      <ThemedText
        style={[styles.chipLabel, { color: selected ? theme.accentForeground : theme.text }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const isCompact = width < 430;
  const horizontalPadding = isCompact ? Spacing.three : Spacing.four;

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    let cancelled = false;

    const loadReports = async () => {
      try {
        const nextReports = await listReportDrafts();
        if (!cancelled) {
          setReports(nextReports);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadReports();

    return () => {
      cancelled = true;
    };
  }, [isFocused]);

  async function removeReport(id: string) {
    // Drop it from the list first so the row disappears under the finger.
    setReports((current) => current.filter((report) => report.id !== id));

    try {
      await deleteReportDraft(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Suppression impossible', message);
      setReports(await listReportDrafts());
    }
  }

  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => reportDate(b).getTime() - reportDate(a).getTime()),
    [reports]
  );

  const years = useMemo(() => {
    const found = new Set(sortedReports.map((report) => reportDate(report).getFullYear()));

    return [...found].sort((a, b) => b - a);
  }, [sortedReports]);

  const visibleReports = useMemo(
    () =>
      selectedYear === null
        ? sortedReports
        : sortedReports.filter((report) => reportDate(report).getFullYear() === selectedYear),
    [selectedYear, sortedReports]
  );

  const groups = useMemo(() => groupByMonth(visibleReports), [visibleReports]);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}>

          <ThemedText themeColor="textSecondary" style={styles.lead}>
            Les rapports enregistrés se consultent et s&apos;exportent, ils ne se modifient plus.
          </ThemedText>

          {loading ? (
            <SectionCard style={styles.noticeCard}>
              <ActivityIndicator color={theme.accent} />
              <ThemedText>Chargement des rapports…</ThemedText>
            </SectionCard>
          ) : sortedReports.length === 0 ? (
            <SectionCard>
              <ThemedText style={styles.emptyTitle}>Aucun rapport enregistré</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                Saisis une intervention puis enregistre-la pour la retrouver ici.
              </ThemedText>
              <PrimaryButton
                onPress={() => router.push('/report/new')}
                style={styles.fullWidth}
                title="Nouveau rapport"
              />
            </SectionCard>
          ) : (
            <>
              {years.length > 1 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterRow}>
                  <FilterChip
                    label="Toutes les années"
                    onPress={() => setSelectedYear(null)}
                    selected={selectedYear === null}
                  />
                  {years.map((year) => (
                    <FilterChip
                      key={year}
                      label={String(year)}
                      onPress={() => setSelectedYear(year)}
                      selected={selectedYear === year}
                    />
                  ))}
                </ScrollView>
              ) : null}

              <ThemedText themeColor="textSecondary" style={styles.count}>
                {visibleReports.length} rapport{visibleReports.length > 1 ? 's' : ''}
              </ThemedText>

              {groups.map((group) => (
                <View key={group.key} style={styles.group}>
                  <ThemedText style={[styles.monthLabel, { color: theme.textSecondary }]}>
                    {group.label}
                  </ThemedText>
                  <SectionCard>
                    <View>
                      {group.reports.map((report, index) => (
                        <ReportRow
                          key={report.id}
                          onDelete={() => removeReport(report.id)}
                          onPress={() =>
                            router.push({ pathname: '/report/[id]', params: { id: report.id } })
                          }
                          report={report}
                          showDivider={index > 0}
                        />
                      ))}
                    </View>
                  </SectionCard>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    alignItems: 'stretch',
  },
  scrollView: {
    flex: 1,
    alignSelf: 'stretch',
  },
  content: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: Spacing.half,
  },
  noticeCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 16,
    lineHeight: 24,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.half,
    paddingVertical: Spacing.half,
  },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: Spacing.three,
  },
  chipLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  count: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: Spacing.half,
  },
  group: {
    gap: Spacing.one,
  },
  monthLabel: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.half,
  },
  fullWidth: {
    width: '100%',
  },
});
