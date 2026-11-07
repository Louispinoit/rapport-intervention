import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CloseIcon, PlusIcon, SearchIcon } from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/pressable-scale';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ReportRow } from '@/components/ui/report-row';
import { SectionCard } from '@/components/ui/section-card';
import { SkeletonRows } from '@/components/ui/skeleton';
import { FontFamily, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { customerFullName, normalizeForSearch, reportDate, type ReportSummary } from '@/lib/report';
import { deleteReportDraft, listReportDrafts } from '@/lib/report-store';

const monthFormatter = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
});

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
      groups.set(key, {
        key,
        label: monthFormatter.format(date),
        reports: [report],
      });
    }
  }

  return [...groups.values()];
}

/**
 * One field searches both the client and the date, because that is how Marc
 * remembers a job: a name, or roughly when it happened. The month name is folded
 * in so "juillet" works as well as "07/2026".
 */
function searchHaystack(report: ReportSummary) {
  return normalizeForSearch(
    [customerFullName(report), report.interventionDate, monthFormatter.format(reportDate(report))]
      .filter(Boolean)
      .join(' ')
  );
}

function matchesQuery(report: ReportSummary, query: string) {
  const tokens = normalizeForSearch(query).split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return true;
  }

  const haystack = searchHaystack(report);

  return tokens.every((token) => haystack.includes(token));
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
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.text : theme.backgroundElement,
          borderColor: selected ? theme.text : theme.line,
        },
      ]}>
      <ThemedText style={[styles.chipLabel, { color: selected ? theme.background : theme.text }]}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const theme = useTheme();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

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
      sortedReports
        .filter(
          (report) => selectedYear === null || reportDate(report).getFullYear() === selectedYear
        )
        .filter((report) => matchesQuery(report, query)),
    [query, selectedYear, sortedReports]
  );

  const sections = useMemo(
    () =>
      groupByMonth(visibleReports).map((group) => ({
        key: group.key,
        label: group.label,
        data: group.reports,
      })),
    [visibleReports]
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {loading || sortedReports.length === 0 ? (
        <View style={styles.content}>
          {loading ? (
            <SectionCard>
              <SkeletonRows count={4} />
            </SectionCard>
          ) : (
            <SectionCard style={styles.emptyCard}>
              <ThemedText type="heading">Aucun rapport enregistré</ThemedText>
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                Saisis une intervention puis enregistre-la : elle se retrouve ici, classée par mois.
                Les rapports se consultent et s’exportent, ils ne se modifient plus.
              </ThemedText>
              <PrimaryButton
                icon={(color) => <PlusIcon color={color} size={20} />}
                onPress={() => router.push('/report/new')}
                style={styles.fullWidth}
                title="Nouveau rapport"
              />
            </SectionCard>
          )}
        </View>
      ) : (
        // Virtualised: years of reports stay smooth, only the rows on screen are
        // drawn. Month titles stick to the top while their reports scroll by.
        <SectionList
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(report) => report.id}
          ListEmptyComponent={
            <SectionCard style={[styles.emptyCard, styles.emptyResults]}>
              <ThemedText type="heading">Aucun résultat</ThemedText>
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                Rien ne correspond à cette recherche. Essaie le nom seul, ou un mois comme « juillet
                ».
              </ThemedText>
            </SectionCard>
          }
          ListFooterComponent={
            visibleReports.length > 0 ? (
              <ThemedText style={[styles.hint, { color: theme.textTertiary }]}>
                Glisse un rapport vers la gauche pour le supprimer.
              </ThemedText>
            ) : null
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View
                style={[
                  styles.search,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: searchFocused ? theme.accent : theme.line,
                  },
                ]}>
                <SearchIcon color={searchFocused ? theme.accent : theme.textTertiary} size={20} />
                <TextInput
                  accessibilityLabel="Rechercher un rapport par client ou par date"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onBlur={() => setSearchFocused(false)}
                  onChangeText={setQuery}
                  onFocus={() => setSearchFocused(true)}
                  placeholder="Client, date ou mois"
                  placeholderTextColor={theme.textTertiary}
                  returnKeyType="search"
                  selectionColor={theme.accent}
                  style={[styles.searchInput, { color: theme.text }]}
                  value={query}
                />
                {query.length > 0 ? (
                  <Pressable
                    accessibilityLabel="Effacer la recherche"
                    accessibilityRole="button"
                    hitSlop={10}
                    onPress={() => setQuery('')}
                    style={[styles.searchClear, { backgroundColor: theme.backgroundSelected }]}>
                    <CloseIcon color={theme.textSecondary} size={14} />
                  </Pressable>
                ) : null}
              </View>

              {years.length > 1 ? (
                <ScrollView
                  contentContainerStyle={styles.filterRow}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.filterScroll}>
                  <FilterChip
                    label="Toutes"
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
            </View>
          }
          renderItem={({ item, index, section }) => {
            const first = index === 0;
            const last = index === section.data.length - 1;

            // Rows of one month read as a single sheet: the first rounds the top,
            // the last rounds the bottom.
            return (
              <View
                style={[
                  styles.sheetRow,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.line,
                  },
                  first && styles.sheetFirst,
                  last && styles.sheetLast,
                ]}>
                <ReportRow
                  onDelete={() => removeReport(item.id)}
                  onPress={() =>
                    router.push({
                      pathname: '/report/[id]',
                      params: { id: item.id },
                    })
                  }
                  report={item}
                  showDivider={!first}
                />
              </View>
            );
          }}
          renderSectionHeader={({ section }) => (
            <View style={[styles.monthHeader, { backgroundColor: theme.background }]}>
              <ThemedText style={styles.monthLabel}>{section.label}</ThemedText>
              <ThemedText style={[styles.monthCount, { color: theme.textTertiary }]}>
                {section.data.length} rapport
                {section.data.length > 1 ? 's' : ''}
              </ThemedText>
            </View>
          )}
          sections={sections}
          stickySectionHeadersEnabled
          style={styles.scroll}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingTop: Spacing.two,
  },
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingBottom: Spacing.six,
  },
  listHeader: {
    gap: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  emptyResults: {
    marginTop: Spacing.three,
  },
  sheetRow: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  sheetFirst: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: 4,
  },
  sheetLast: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
    paddingBottom: 4,
  },
  emptyCard: {
    gap: Spacing.three,
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: 15,
    lineHeight: 22,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingLeft: 18,
    paddingRight: 10,
  },
  searchInput: {
    flex: 1,
    minHeight: 54,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 16,
  },
  searchClear: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterScroll: {
    marginHorizontal: -14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: 14,
  },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    // 48dp: Material's minimum touch target.
    minHeight: 48,
    paddingHorizontal: 18,
  },
  chipLabel: {
    fontFamily: FontFamily.bodySemibold,
    fontSize: 14,
    lineHeight: 20,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
    paddingTop: Spacing.four,
    paddingBottom: 10,
  },
  monthLabel: {
    fontFamily: FontFamily.display,
    fontSize: 22,
    lineHeight: 26,
    textTransform: 'uppercase',
  },
  monthCount: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  hint: {
    marginTop: Spacing.three,
    fontFamily: FontFamily.body,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  fullWidth: {
    width: '100%',
  },
});
