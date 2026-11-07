import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ChimneySmoke } from '@/components/ui/chimney-smoke';
import { ArrowRightIcon, ChimneyMark, PlusIcon } from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/pressable-scale';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ReportRow } from '@/components/ui/report-row';
import { SectionCard } from '@/components/ui/section-card';
import { SkeletonRows } from '@/components/ui/skeleton';
import { FontFamily, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { reportDate, type ReportSummary } from '@/lib/report';
import { listReportDrafts } from '@/lib/report-store';

const RECENT_LIMIT = 4;
const SHEET_OVERLAP = 32;
const WATERMARK_SIZE = 260;
const rowEntrance = (index: number) =>
  FadeInDown.duration(280)
    .delay(index * 45)
    .easing(Easing.bezier(0.23, 1, 0.32, 1));

function countLine(reports: ReportSummary[]) {
  const now = new Date();
  const thisMonth = reports.filter((report) => {
    const date = reportDate(report);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }).length;

  if (reports.length === 0) {
    return 'Prêt pour la première intervention.';
  }

  const total = `${reports.length} rapport${reports.length > 1 ? 's' : ''} enregistré${reports.length > 1 ? 's' : ''}`;

  if (thisMonth === reports.length) {
    return `${total} ce mois-ci.`;
  }

  return thisMonth > 0 ? `${total}, dont ${thisMonth} ce mois-ci.` : `${total}.`;
}

export default function HomeScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);

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
  const summary = useMemo(() => countLine(reports), [reports]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* White icons over the red livery, only while this screen is in front. */}
      {isFocused ? <StatusBar style="light" /> : null}

      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scroll}>
        {/* Livery: the van's red, with the mark painted large in a deeper red. */}
        <View
          style={[
            styles.livery,
            {
              backgroundColor: theme.livery,
              paddingTop: insets.top + Spacing.four,
            },
          ]}>
          <View style={styles.watermark}>
            <ChimneySmoke
              color={theme.accentForeground}
              markSize={WATERMARK_SIZE}
              running={isFocused}
            />
            <ChimneyMark brush={false} color={theme.liveryShade} size={WATERMARK_SIZE} />
          </View>

          <View style={styles.liveryInner}>
            <View style={styles.brandRow}>
              <ChimneyMark color={theme.accentForeground} size={22} />
              <ThemedText style={[styles.brand, { color: theme.accentForeground }]}>
                DSSV · Depuis Sud Vendée
              </ThemedText>
            </View>

            <ThemedText style={[styles.title, { color: theme.accentForeground }]}>
              {'Rapports\nd’intervention'}
            </ThemedText>

            <ThemedText style={[styles.summary, { color: theme.accentForeground }]}>
              {loading ? ' ' : summary}
            </ThemedText>
          </View>
        </View>

        <View style={styles.sheetWrap}>
          <SectionCard style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <ThemedText style={{ color: theme.textSecondary }} type="label">
                Derniers rapports
              </ThemedText>
            </View>

            {loading ? (
              <SkeletonRows count={3} />
            ) : recentReports.length === 0 ? (
              <View style={styles.empty}>
                <View style={[styles.emptyMark, { backgroundColor: theme.accentSoft }]}>
                  <ChimneyMark color={theme.accent} size={34} />
                </View>
                <ThemedText style={styles.emptyTitle}>Aucun rapport pour l’instant</ThemedText>
                <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Remplis le rapport chez le client avec le bouton en bas. Il s’enregistre ici,
                  et son PDF se régénère à tout moment.
                </ThemedText>
              </View>
            ) : (
              <View>
                {recentReports.map((report, index) => (
                  <Animated.View entering={rowEntrance(index)} key={report.id}>
                    <ReportRow
                      onPress={() =>
                        router.push({ pathname: '/report/[id]', params: { id: report.id } })
                      }
                      report={report}
                      showDivider={index > 0}
                    />
                  </Animated.View>
                ))}
              </View>
            )}

            {reports.length > 0 ? (
              <PressableScale
                accessibilityRole="button"
                onPress={() => router.push('/history')}
                scaleTo={0.98}
                style={({ pressed }) => [
                  styles.allLink,
                  {
                    backgroundColor: pressed ? theme.backgroundSelected : theme.background,
                    borderColor: theme.line,
                  },
                ]}>
                <ThemedText style={styles.allLinkText}>Tout l’historique</ThemedText>
                <View style={styles.allLinkEnd}>
                  <ThemedText style={[styles.allLinkCount, { color: theme.textSecondary }]}>
                    {reports.length}
                  </ThemedText>
                  <ArrowRightIcon color={theme.accent} size={18} />
                </View>
              </PressableScale>
            ) : null}
          </SectionCard>
        </View>
      </ScrollView>

      {/* Primary action stays in the thumb zone, not at the top of the screen. */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.line,
            paddingBottom: Math.max(insets.bottom, Spacing.three),
          },
        ]}>
        <PrimaryButton
          icon={(color) => <PlusIcon color={color} size={20} />}
          onPress={() => router.push('/report/new')}
          style={styles.footerButton}
          title="Nouveau rapport"
        />
      </View>
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
  scrollContent: {
    paddingBottom: Spacing.five,
  },
  livery: {
    overflow: 'hidden',
    paddingBottom: SHEET_OVERLAP + Spacing.five,
    paddingHorizontal: 20,
  },
  watermark: {
    position: 'absolute',
    pointerEvents: 'none',
    right: -54,
    bottom: -18,
  },
  liveryInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.three,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brand: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  title: {
    marginTop: Spacing.four,
    fontFamily: FontFamily.displayHeavy,
    fontSize: 54,
    lineHeight: 50,
    letterSpacing: -0.6,
    textTransform: 'uppercase',
  },
  summary: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.88,
  },
  sheetWrap: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    marginTop: -SHEET_OVERLAP,
    paddingHorizontal: 14,
  },
  sheet: {
    borderRadius: Radius.xl,
    gap: Spacing.two,
    paddingTop: 20,
    paddingBottom: 14,
    paddingHorizontal: 14,
  },
  sheetHeader: {
    paddingHorizontal: Spacing.one,
    paddingBottom: Spacing.one,
  },
  empty: {
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  emptyMark: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  emptyTitle: {
    fontFamily: FontFamily.display,
    fontSize: 24,
    lineHeight: 28,
    textTransform: 'uppercase',
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 420,
  },
  allLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  allLinkText: {
    fontFamily: FontFamily.bodySemibold,
    fontSize: 15,
    lineHeight: 22,
  },
  allLinkEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  allLinkCount: {
    fontFamily: FontFamily.bodySemibold,
    fontVariant: ['tabular-nums'],
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  footerButton: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
});
