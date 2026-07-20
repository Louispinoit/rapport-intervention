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
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SectionCard } from '@/components/ui/section-card';
import { COMPANY_NAME } from '@/constants/company';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listReportDrafts } from '@/lib/report-store';
import type { ReportSummary } from '@/lib/report';

function formatDate(value: string) {
  if (!value) {
    return 'Date non renseignée';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function getReportTitle() {
  return 'Rapport d’intervention';
}

export default function HistoryScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
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
      setLoading(true);
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

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}>

          <View style={styles.header}>
            <ThemedText style={[styles.company, { color: theme.accent }]}>{COMPANY_NAME}</ThemedText>
            <ThemedText type="subtitle" style={isCompact ? styles.titleCompact : undefined}>
              Rapports enregistrés
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={[styles.lead, isCompact && styles.leadCompact]}>
              Retrouve ici les rapports saisis sur l&apos;appareil et rouvre un dossier en un appui.
            </ThemedText>
          </View>

          {loading ? (
            <SectionCard style={styles.loadingCard}>
              <ActivityIndicator color={theme.accent} />
              <ThemedText>Chargement des rapports…</ThemedText>
            </SectionCard>
          ) : reports.length === 0 ? (
            <SectionCard>
              <ThemedText style={styles.emptyTitle}>Aucun rapport enregistré</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                Commence une intervention puis enregistre-la pour la retrouver ici.
              </ThemedText>
              <PrimaryButton
                title="Créer un rapport"
                onPress={() => router.push('/report/new')}
                style={styles.fullWidth}
              />
            </SectionCard>
          ) : (
            <View style={styles.list}>
              {reports.map((report) => (
                <Pressable
                  key={report.id}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: '/report/new',
                      params: { draftId: report.id },
                    })
                  }
                  style={({ pressed }) => [{ opacity: pressed ? 0.78 : 1 }]}>
                  <SectionCard style={styles.reportCard}>
                    <View style={styles.reportCardInner}>
                      <View style={styles.reportCardMain}>
                        <ThemedText style={styles.customerName}>{getReportTitle()}</ThemedText>
                        <ThemedText themeColor="textSecondary" style={styles.updatedText}>
                          Mis à jour : {formatDate(report.updatedAt)}
                        </ThemedText>
                      </View>
                      <View style={[styles.chevronWrapper, { borderColor: theme.backgroundSelected }]}>
                        <ThemedText style={[styles.chevron, { color: theme.textSecondary }]}>›</ThemedText>
                      </View>
                    </View>
                  </SectionCard>
                </Pressable>
              ))}
            </View>
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
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.five,
  },
  header: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.half,
  },
  company: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  lead: {
    fontSize: 17,
    lineHeight: 25,
  },
  leadCompact: {
    fontSize: 16,
    lineHeight: 24,
  },
  titleCompact: {
    fontSize: 24,
    lineHeight: 30,
  },
  loadingCard: {
    alignItems: 'center',
    gap: Spacing.three,
    flexDirection: 'row',
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
  fullWidth: {
    width: '100%',
  },
  list: {
    gap: Spacing.two,
  },
  reportCard: {
    gap: 0,
    padding: Spacing.three,
  },
  reportCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  reportCardMain: {
    flex: 1,
    gap: Spacing.one,
  },
  customerName: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  updatedText: {
    fontSize: 13,
    lineHeight: 18,
  },
  chevronWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  chevron: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '300',
  },
});
