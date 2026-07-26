import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
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
import { CheckRow } from '@/components/ui/check-row';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SectionCard } from '@/components/ui/section-card';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  adviceOptions,
  createEmptyReport,
  parseInterventionDate,
  saveReportPdf,
  serviceOptions,
  sootTypeOptions,
  sootVolumeOptions,
  toggleSelection,
  visibleDefectOptions,
  type ReportDraft,
} from '@/lib/report';
import { saveReportDraft } from '@/lib/report-store';

type MultiChoiceKey = 'services' | 'sootTypes' | 'visibleDefects' | 'advice';

function ChoiceGroup({
  title,
  hint,
  options,
  selectedValues,
  onToggle,
  single = false,
}: {
  title?: string;
  hint?: string;
  options: readonly string[];
  selectedValues: string[];
  onToggle: (option: string) => void;
  single?: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={styles.group}>
      {title ? (
        <View style={styles.groupHeader}>
          <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>{title}</ThemedText>
          {hint ? (
            <ThemedText style={[styles.groupHint, { color: theme.textSecondary }]}>{hint}</ThemedText>
          ) : null}
        </View>
      ) : null}
      <View>
        {options.map((option, index) => (
          <CheckRow
            checked={selectedValues.includes(option)}
            key={option}
            label={option}
            onPress={() => onToggle(option)}
            shape={single ? 'radio' : 'check'}
            showDivider={index > 0}
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
  const router = useRouter();
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [report, setReport] = useState<ReportDraft>(() => createEmptyReport());
  const isCompact = width < 430;
  const horizontalPadding = isCompact ? Spacing.three : Spacing.four;
  const dateIsValid = parseInterventionDate(report.interventionDate) !== null;

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

  async function persistReport() {
    const nextReport = {
      ...report,
      updatedAt: new Date().toISOString(),
    };

    await saveReportDraft(nextReport);
    setReport(nextReport);

    return nextReport;
  }

  function openSavedReport(id: string, exported = false) {
    router.replace({
      pathname: '/report/[id]',
      params: exported ? { id, exported: '1' } : { id },
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const storedReport = await persistReport();
      openSavedReport(storedReport.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Enregistrement impossible', message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveToFiles() {
    setExporting(true);
    try {
      const storedReport = await persistReport();
      const result = await saveReportPdf(storedReport);
      // A cancelled folder picker still leaves the report saved, but there is no
      // PDF to point at, so the Abby prompt would be a lie.
      openSavedReport(storedReport.id, result.status !== 'cancelled');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Enregistrement impossible', message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
          keyboardShouldPersistTaps="handled">

          {/* The date is the only thing identifying a report — the client is on the invoice. */}
          <SectionCard>
            <View style={styles.group}>
              <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Date de l&apos;intervention
              </ThemedText>
              <TextInput
                inputMode="numeric"
                onChangeText={(value) => updateField('interventionDate', value)}
                placeholder="jj/mm/aaaa"
                placeholderTextColor={theme.textSecondary}
                selectionColor={theme.accent}
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: theme.background,
                    borderColor: dateIsValid ? theme.backgroundSelected : theme.accent,
                    color: theme.text,
                  },
                ]}
                value={report.interventionDate}
              />
              {dateIsValid ? null : (
                <ThemedText style={[styles.dateHint, { color: theme.accent }]}>
                  Format attendu : jj/mm/aaaa
                </ThemedText>
              )}
            </View>
          </SectionCard>

          {/* Section 01 - Prestation */}
          <SectionCard>
            <SectionHeader number="01" title="Prestation demandée par le client" compact={isCompact} />
            <ChoiceGroup
              onToggle={(option) => updateMultiChoice('services', option)}
              options={serviceOptions}
              selectedValues={report.services}
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
            <ChoiceGroup
              hint="Un seul choix"
              onToggle={(option) => updateField('sootVolume', option)}
              options={sootVolumeOptions}
              selectedValues={report.sootVolume ? [report.sootVolume] : []}
              single
              title="Volume des suies"
            />
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
              title="À remettre au client"
            />
          </SectionCard>

          {/* Section 04 - Observations */}
          <SectionCard>
            <SectionHeader number="04" title="Autres observations" compact={isCompact} />
            <TextInput
              multiline
              onChangeText={(value) => updateField('observations', value)}
              placeholder="Noter un point particulier relevé sur place"
              placeholderTextColor={theme.textSecondary}
              selectionColor={theme.accent}
              style={[
                styles.input,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.backgroundSelected,
                  color: theme.text,
                },
              ]}
              value={report.observations}
            />
          </SectionCard>

          {/* Actions */}
          <SectionCard style={styles.actionsCard}>
            <ThemedText themeColor="textSecondary" style={styles.actionsNote}>
              Une fois enregistré, le rapport ne se modifie plus. Son PDF reste régénérable à tout
              moment.
            </ThemedText>
            <View style={styles.actions}>
              <PrimaryButton
                disabled={saving || exporting}
                onPress={handleSave}
                style={styles.fullWidth}
                title={saving ? 'Enregistrement…' : 'Enregistrer sans le PDF'}
                variant="secondary"
              />
              <PrimaryButton
                disabled={saving || exporting}
                onPress={handleSaveToFiles}
                style={styles.fullWidth}
                title={exporting ? 'Enregistrement…' : 'Enregistrer et mettre le PDF dans mes fichiers'}
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
  fieldLabel: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateInput: {
    borderRadius: Radius.md,
    borderWidth: 1,
    minHeight: 54,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
  },
  dateHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    minHeight: 96,
    textAlignVertical: 'top',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    lineHeight: 24,
  },
  group: {
    gap: Spacing.one,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  groupHint: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  actionsCard: {
    marginTop: Spacing.two,
  },
  actionsNote: {
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    gap: Spacing.two,
  },
  fullWidth: {
    width: '100%',
  },
});
