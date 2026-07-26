import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ReportRow } from '@/components/ui/report-row';
import { SectionCard } from '@/components/ui/section-card';
import { COMPANY_NAME } from '@/constants/company';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ReportSummary } from '@/lib/report';
import { listReportDrafts } from '@/lib/report-store';

const RECENT_LIMIT = 4;

export default function HomeScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
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

  const recentReports = reports.slice(0, RECENT_LIMIT);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}>

          <View style={styles.header}>
            <ThemedText style={[styles.eyebrow, { color: theme.accent }]}>{COMPANY_NAME}</ThemedText>
            <ThemedText type="title" style={[styles.title, isCompact && styles.titleCompact]}>
              Rapports d&apos;intervention
            </ThemedText>
          </View>

          <SectionCard>
            <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              Derniers rapports
            </ThemedText>

            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={theme.accent} />
              </View>
            ) : recentReports.length === 0 ? (
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                Le premier rapport que tu enregistres apparaîtra ici.
              </ThemedText>
            ) : (
              <View>
                {recentReports.map((report, index) => (
                  <ReportRow
                    key={report.id}
                    onPress={() => router.push({ pathname: '/report/[id]', params: { id: report.id } })}
                    report={report}
                    showDivider={index > 0}
                  />
                ))}
              </View>
            )}

            {reports.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/history')}
                style={({ pressed }) => [styles.allLink, pressed && { opacity: 0.6 }]}>
                <ThemedText style={[styles.allLinkText, { color: theme.accent }]}>
                  Tous les rapports ({reports.length})
                </ThemedText>
              </Pressable>
            ) : null}
          </SectionCard>

        </ScrollView>

        {/* Primary action stays in the thumb zone, not at the top of the screen. */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.backgroundSelected,
              paddingBottom: Math.max(insets.bottom, Spacing.three),
              paddingHorizontal: horizontalPadding,
            },
          ]}>
          <PrimaryButton
            onPress={() => router.push('/report/new')}
            style={styles.fullWidth}
            title="Nouveau rapport"
          />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
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
    paddingTop: Spacing.five,
    paddingBottom: Spacing.four,
  },
  header: {
    gap: Spacing.one,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
  },
  titleCompact: {
    fontSize: 28,
    lineHeight: 34,
  },
  sectionLabel: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingRow: {
    alignItems: 'flex-start',
    paddingVertical: Spacing.two,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
  },
  allLink: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: Spacing.two,
  },
  allLinkText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
  },
  fullWidth: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
});
