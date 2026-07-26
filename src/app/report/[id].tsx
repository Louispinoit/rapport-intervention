import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CheckRow } from '@/components/ui/check-row';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SectionCard } from '@/components/ui/section-card';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { chooseSaveDirectory, saveReportPdf, type ReportDraft } from '@/lib/report';
import { loadReportDraft } from '@/lib/report-store';

/** Abby's web app, which unlike its native app can attach a file to an invoice. */
const ABBY_URL = 'https://my.app-abby.com';

function SectionHeader({ number, title, compact }: { number: string; title: string; compact: boolean }) {
  const theme = useTheme();

  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionNumberBadge, { backgroundColor: theme.accentSoft }]}>
        <ThemedText style={[styles.sectionNumber, { color: theme.accent }]}>{number}</ThemedText>
      </View>
      <ThemedText style={[styles.sectionTitle, compact && styles.sectionTitleCompact]}>
        {title}
      </ThemedText>
    </View>
  );
}

/** Saved reports show what was ticked, not the options that were left empty. */
function SelectedList({ title, values }: { title?: string; values: string[] }) {
  const theme = useTheme();

  return (
    <View style={styles.group}>
      {title ? (
        <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>{title}</ThemedText>
      ) : null}
      {values.length === 0 ? (
        <ThemedText themeColor="textSecondary" style={styles.emptyLine}>
          Rien de coché
        </ThemedText>
      ) : (
        <View>
          {values.map((value, index) => (
            <CheckRow checked key={value} label={value} readOnly showDivider={index > 0} />
          ))}
        </View>
      )}
    </View>
  );
}

export default function SavedReportScreen() {
  const params = useLocalSearchParams<{ id?: string; exported?: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState<ReportDraft | null>(null);
  // Shown on arrival from an export, so it survives the Android share sheet
  // instead of firing while the user is still in another app.
  const [invoicePrompt, setInvoicePrompt] = useState(params.exported === '1');
  const isCompact = width < 430;
  const horizontalPadding = isCompact ? Spacing.three : Spacing.four;

  useEffect(() => {
    let cancelled = false;

    const loadReport = async () => {
      setLoading(true);
      try {
        const stored = typeof params.id === 'string' ? await loadReportDraft(params.id) : null;
        if (!cancelled) {
          setReport(stored);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadReport();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  function openAbby() {
    setInvoicePrompt(false);
    WebBrowser.openBrowserAsync(ABBY_URL, {
      toolbarColor: theme.accent,
      // Android always shows the domain in a custom tab, so keep the bar as
      // small as possible and let it slide away on scroll.
      showTitle: false,
      enableBarCollapsing: true,
      createTask: false,
    });
  }

  async function handleSaveToFiles() {
    if (!report) {
      return;
    }

    setSaving(true);
    try {
      const result = await saveReportPdf(report);

      if (result.status === 'saved') {
        Alert.alert('Rapport enregistré', `${result.name} a été écrit dans ton dossier.`, [
          { text: 'Terminé', style: 'cancel' },
          { text: 'Changer de dossier', onPress: () => chooseSaveDirectory() },
        ]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Enregistrement impossible', message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <SectionCard style={styles.noticeCard}>
            <ActivityIndicator color={theme.accent} />
            <ThemedText>Ouverture du rapport…</ThemedText>
          </SectionCard>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!report) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <SectionCard style={styles.missingCard}>
            <ThemedText style={styles.missingTitle}>Rapport introuvable</ThemedText>
            <ThemedText themeColor="textSecondary">
              Ce rapport n&apos;est plus enregistré sur cet appareil.
            </ThemedText>
            <PrimaryButton
              onPress={() => router.replace('/history')}
              style={styles.fullWidth}
              title="Revenir aux rapports"
            />
          </SectionCard>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}>

          {invoicePrompt ? (
            <View
              style={[
                styles.promptCard,
                { backgroundColor: theme.accentSoft, borderColor: theme.accent },
              ]}>
              <ThemedText style={[styles.promptTitle, { color: theme.accent }]}>
                PDF enregistré
              </ThemedText>
              <ThemedText style={styles.promptText}>
                Il reste à créer la facture correspondante dans Abby.
              </ThemedText>
              <View style={styles.promptActions}>
                <PrimaryButton onPress={openAbby} style={styles.promptButton} title="Ouvrir Abby" />
                <PrimaryButton
                  onPress={() => setInvoicePrompt(false)}
                  style={styles.promptButton}
                  title="Plus tard"
                  variant="secondary"
                />
              </View>
            </View>
          ) : null}

          <SectionCard style={styles.headerCard}>
            <View style={[styles.lockBadge, { backgroundColor: theme.accentSoft }]}>
              <ThemedText style={[styles.lockText, { color: theme.accent }]}>
                Rapport enregistré · lecture seule
              </ThemedText>
            </View>
            <ThemedText style={[styles.headerTitle, isCompact && styles.headerTitleCompact]}>
              Intervention du {report.interventionDate || 'jour non renseigné'}
            </ThemedText>
          </SectionCard>

          <SectionCard>
            <SectionHeader number="01" title="Prestation demandée par le client" compact={isCompact} />
            <SelectedList values={report.services} />
          </SectionCard>

          <SectionCard>
            <SectionHeader number="02" title="Rapport d'intervention" compact={isCompact} />
            <SelectedList title="Types de suies" values={report.sootTypes} />
            <SelectedList title="Volume des suies" values={report.sootVolume ? [report.sootVolume] : []} />
            <SelectedList title="Défauts apparents" values={report.visibleDefects} />
          </SectionCard>

          <SectionCard>
            <SectionHeader number="03" title="Conseils" compact={isCompact} />
            <SelectedList values={report.advice} />
          </SectionCard>

          <SectionCard>
            <SectionHeader number="04" title="Autres observations" compact={isCompact} />
            <ThemedText
              themeColor={report.observations ? 'text' : 'textSecondary'}
              style={styles.observations}>
              {report.observations || 'Aucune observation complémentaire'}
            </ThemedText>
          </SectionCard>

          <SectionCard style={styles.actionsCard}>
            <PrimaryButton
              disabled={saving}
              onPress={handleSaveToFiles}
              style={styles.fullWidth}
              title={saving ? 'Enregistrement…' : 'Enregistrer dans mes fichiers'}
            />
            <PrimaryButton
              onPress={openAbby}
              style={styles.fullWidth}
              title="Ouvrir Abby"
              variant="secondary"
            />
            <ThemedText themeColor="textSecondary" style={styles.actionsNote}>
              Le PDF est reconstruit à chaque fois : tu peux le réenregistrer autant que nécessaire.
            </ThemedText>
          </SectionCard>

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
    gap: Spacing.two,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
  },
  noticeCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'center',
    marginHorizontal: Spacing.four,
    marginTop: Spacing.four,
  },
  missingCard: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.four,
  },
  missingTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  promptCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    gap: Spacing.two,
    padding: 20,
  },
  promptTitle: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptText: {
    fontSize: 16,
    lineHeight: 23,
  },
  promptActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  promptButton: {
    flex: 1,
  },
  headerCard: {
    gap: Spacing.two,
  },
  lockBadge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half + 2,
  },
  lockText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
  },
  headerTitleCompact: {
    fontSize: 20,
    lineHeight: 26,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sectionNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionNumber: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    flex: 1,
  },
  sectionTitleCompact: {
    fontSize: 18,
    lineHeight: 24,
  },
  group: {
    gap: Spacing.one,
  },
  fieldLabel: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyLine: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
    paddingVertical: Spacing.one,
  },
  observations: {
    fontSize: 16,
    lineHeight: 24,
  },
  actionsNote: {
    fontSize: 13,
    lineHeight: 19,
  },
  actionsCard: {
    marginTop: Spacing.two,
  },
  fullWidth: {
    width: '100%',
  },
});
