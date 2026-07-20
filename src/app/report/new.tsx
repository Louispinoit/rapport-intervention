import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChoiceChip } from '@/components/ui/choice-chip';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SectionCard } from '@/components/ui/section-card';
import { APP_LABEL, COMPANY_NAME } from '@/constants/company';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  adviceOptions,
  createEmptyReport,
  exportReportPdf,
  serviceOptions,
  sootTypeOptions,
  sootVolumeOptions,
  toggleSelection,
  visibleDefectOptions,
  type ReportDraft,
} from '@/lib/report';
import { loadReportDraft, saveReportDraft } from '@/lib/report-store';

type MultiChoiceKey = 'services' | 'sootTypes' | 'visibleDefects' | 'advice';

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (nextValue: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address';
}) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</ThemedText>
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.backgroundSelected}
        selectionColor={theme.accent}
        style={[
          styles.input,
          multiline && styles.multilineInput,
          {
            backgroundColor: theme.background,
            borderColor: theme.backgroundSelected,
            color: theme.text,
          },
        ]}
        value={value}
      />
    </View>
  );
}

function ChoiceGroup({
  title,
  options,
  selectedValues,
  onToggle,
}: {
  title: string;
  options: readonly string[];
  selectedValues: string[];
  onToggle: (option: string) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.group}>
      <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>{title}</ThemedText>
      <View style={styles.wrap}>
        {options.map((option) => (
          <ChoiceChip
            key={option}
            label={option}
            onPress={() => onToggle(option)}
            selected={selectedValues.includes(option)}
          />
        ))}
      </View>
    </View>
  );
}

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

export default function NewReportScreen() {
  const params = useLocalSearchParams<{ draftId?: string }>();
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [report, setReport] = useState<ReportDraft>(() => createEmptyReport());
  const isCompact = width < 430;
  const isVeryCompact = width < 360;
  const horizontalPadding = isCompact ? Spacing.three : Spacing.four;

  useEffect(() => {
    let cancelled = false;

    const loadDraft = async () => {
      setLoading(true);

      try {
        if (typeof params.draftId !== 'string') {
          if (!cancelled) {
            setReport(createEmptyReport());
          }
          return;
        }

        const storedDraft = await loadReportDraft(params.draftId);
        if (!cancelled && storedDraft) {
          setReport(storedDraft);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDraft();

    return () => {
      cancelled = true;
    };
  }, [params.draftId]);

  function updateField<Key extends keyof ReportDraft>(key: Key, value: ReportDraft[Key]) {
    setReport((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateMultiChoice(key: MultiChoiceKey, option: string) {
    setReport((current) => ({
      ...current,
      [key]: toggleSelection(current[key], option),
    }));
  }

  async function persistReport(showSuccessMessage: boolean) {
    const nextReport = {
      ...report,
      updatedAt: new Date().toISOString(),
    };

    setSaving(true);
    try {
      await saveReportDraft(nextReport);
      setReport(nextReport);

      if (showSuccessMessage) {
        Alert.alert('Rapport enregistré', 'Le rapport a été sauvegardé sur cet appareil.');
      }

      return nextReport;
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const storedReport = await persistReport(false);
      await exportReportPdf(storedReport);
      Alert.alert('PDF prêt', 'Le rapport a été généré puis ouvert au partage.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Export impossible', message);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <SectionCard style={styles.loadingCard}>
            <ActivityIndicator color={theme.accent} />
            <ThemedText>Chargement du rapport…</ThemedText>
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

          {/* Hero / summary card */}
          <SectionCard>
            <View style={styles.heroTop}>
              <View style={[styles.companyBadge, { backgroundColor: theme.accentSoft, borderColor: theme.backgroundSelected }]}>
                <ThemedText style={[styles.companyText, { color: theme.accent }]}>{COMPANY_NAME}</ThemedText>
              </View>
            </View>
            <ThemedText
              type="subtitle"
              style={[
                styles.heroTitle,
                isCompact && styles.heroTitleCompact,
                isVeryCompact && styles.heroTitleVeryCompact,
              ]}>
              {APP_LABEL}
            </ThemedText>
            <ThemedText
              themeColor="textSecondary"
              style={[styles.heroLead, isCompact && styles.heroLeadCompact]}>
              Rapport d&apos;intervention et conseils, prêt à être exporté en PDF.
            </ThemedText>
          </SectionCard>

          {/* Section 01 - Prestation */}
          <SectionCard>
            <SectionHeader number="01" title="Prestation demandée par le client" compact={isCompact} />
            <ChoiceGroup
              onToggle={(option) => updateMultiChoice('services', option)}
              options={serviceOptions}
              selectedValues={report.services}
              title="Cases à cocher"
            />
          </SectionCard>

          {/* Section 02 - Rapport */}
          <SectionCard>
            <SectionHeader number="02" title="Rapport d'intervention" compact={isCompact} />
            <ChoiceGroup
              onToggle={(option) => updateMultiChoice('sootTypes', option)}
              options={sootTypeOptions}
              selectedValues={report.sootTypes}
              title="Types de suies"
            />
            <View style={styles.group}>
              <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>Volume des suies</ThemedText>
              <View style={styles.wrap}>
                {sootVolumeOptions.map((option) => (
                  <ChoiceChip
                    key={option}
                    label={option}
                    onPress={() => updateField('sootVolume', option)}
                    selected={report.sootVolume === option}
                  />
                ))}
              </View>
            </View>
            <ChoiceGroup
              onToggle={(option) => updateMultiChoice('visibleDefects', option)}
              options={visibleDefectOptions}
              selectedValues={report.visibleDefects}
              title="Défauts apparents"
            />
          </SectionCard>

          {/* Section 03 - Conseils */}
          <SectionCard>
            <SectionHeader number="03" title="Conseils" compact={isCompact} />
            <ChoiceGroup
              onToggle={(option) => updateMultiChoice('advice', option)}
              options={adviceOptions}
              selectedValues={report.advice}
              title="Conseils à remettre au client"
            />
          </SectionCard>

          {/* Section 04 - Observations */}
          <SectionCard>
            <SectionHeader number="04" title="Autres observations" compact={isCompact} />
            <Field
              label="Observations complémentaires"
              multiline
              onChangeText={(value) => updateField('observations', value)}
              placeholder="Observations complémentaires"
              value={report.observations}
            />
          </SectionCard>

          {/* Actions */}
          <SectionCard style={styles.actionsCard}>
            <View style={styles.actions}>
              <PrimaryButton
                disabled={saving || exporting}
                onPress={() => persistReport(true)}
                title={saving ? 'Enregistrement…' : 'Enregistrer le rapport'}
                variant="secondary"
                style={styles.fullWidth}
              />
              <PrimaryButton
                disabled={saving || exporting}
                onPress={handleExport}
                title={exporting ? 'Génération…' : 'Exporter le PDF'}
                style={styles.fullWidth}
              />
            </View>
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
  loadingCard: {
    alignItems: 'center',
    gap: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: Spacing.four,
    marginTop: Spacing.four,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  companyBadge: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half + 2,
  },
  companyText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    width: '100%',
  },
  heroTitleCompact: {
    fontSize: 22,
    lineHeight: 28,
  },
  heroTitleVeryCompact: {
    fontSize: 20,
    lineHeight: 26,
  },
  heroLead: {
    fontSize: 15,
    lineHeight: 23,
    width: '100%',
  },
  heroLeadCompact: {
    fontSize: 14,
    lineHeight: 21,
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
    flexShrink: 0,
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
  field: {
    gap: Spacing.one,
  },
  fieldLabel: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    minHeight: 50,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    lineHeight: 24,
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  group: {
    gap: Spacing.two,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + Spacing.half,
  },
  actionsCard: {
    marginTop: Spacing.two,
  },
  actions: {
    gap: Spacing.two,
  },
  fullWidth: {
    width: '100%',
  },
});
