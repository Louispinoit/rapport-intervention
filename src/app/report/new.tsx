import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { CheckRow } from '@/components/ui/check-row';
import { FormProgress } from '@/components/ui/form-progress';
import { FormSection, GroupLabel } from '@/components/ui/form-section';
import { DownloadIcon } from '@/components/ui/icons';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SectionCard } from '@/components/ui/section-card';
import { PhotoField } from '@/components/ui/photo-field';
import { SignatureField } from '@/components/ui/signature-pad';
import { TextField } from '@/components/ui/text-field';
import { FontFamily, MaxContentWidth, Spacing } from '@/constants/theme';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
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
import { loadReportDraft, saveReportDraft } from '@/lib/report-store';

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
  return (
    <View style={styles.group}>
      {title ? <GroupLabel hint={hint} title={title} /> : null}
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

export default function NewReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const keyboardVisible = useKeyboardVisible();
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [report, setReport] = useState<ReportDraft>(() => createEmptyReport());
  // `from` = an earlier report for the same client, from a reminder or a saved report.
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [prefilledFrom, setPrefilledFrom] = useState<string | null>(null);

  useEffect(() => {
    if (typeof from !== 'string') {
      return;
    }

    let cancelled = false;
    loadReportDraft(from).then((previous) => {
      if (cancelled || !previous) {
        return;
      }
      // Only who and where carry over: the findings belong to this visit.
      setReport((current) => ({
        ...current,
        customerLastName: previous.customerLastName,
        customerFirstName: previous.customerFirstName,
        customerAddress: previous.customerAddress,
        customerPhone: previous.customerPhone,
      }));
      setPrefilledFrom(previous.interventionDate);
    });

    return () => {
      cancelled = true;
    };
  }, [from]);
  const isCompact = width < 380;
  const dateIsValid = parseInterventionDate(report.interventionDate) !== null;
  const busy = saving || exporting;
  const steps = [
    {
      label: 'Client',
      done: Boolean(report.customerLastName.trim() || report.customerFirstName.trim()) && dateIsValid,
    },
    { label: 'Prestation', done: report.services.length > 0 },
    {
      label: 'Constat',
      done: report.sootTypes.length > 0 || report.sootVolume !== '' || report.visibleDefects.length > 0,
    },
    { label: 'Conseils', done: report.advice.length > 0 },
    { label: 'Signature', done: report.signature.length > 0 },
  ];

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
      // `saved` plays the stamp landing once, on arrival from this form only.
      params: exported ? { id, saved: '1', exported: '1' } : { id, saved: '1' },
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
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <FormProgress steps={steps} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}>
        {/* The head of the form: who and when, the way a carnet stub is filled. */}
        <SectionCard style={styles.headCard}>
          <ThemedText style={{ color: theme.accent }} type="label">
            Fiche d’intervention
          </ThemedText>
          {prefilledFrom ? (
            <ThemedText style={[styles.prefill, { color: theme.textSecondary }]}>
              Client repris du rapport du {prefilledFrom}. Vérifie l’adresse et le téléphone.
            </ThemedText>
          ) : null}
          <View style={[styles.nameRow, isCompact && styles.nameRowStacked]}>
            <View style={styles.nameField}>
              <TextField
                autoCapitalize="words"
                label="Nom"
                onChangeText={(value) => updateField('customerLastName', value)}
                placeholder="Dupont"
                returnKeyType="next"
                value={report.customerLastName}
              />
            </View>
            <View style={styles.nameField}>
              <TextField
                autoCapitalize="words"
                label="Prénom"
                onChangeText={(value) => updateField('customerFirstName', value)}
                placeholder="Jean"
                returnKeyType="next"
                value={report.customerFirstName}
              />
            </View>
          </View>
          <TextField
            emphasis
            error={dateIsValid ? null : 'Format attendu : jj/mm/aaaa'}
            inputMode="numeric"
            label="Date de l’intervention"
            onChangeText={(value) => updateField('interventionDate', value)}
            placeholder="jj/mm/aaaa"
            value={report.interventionDate}
          />
          <TextField
            autoCapitalize="sentences"
            autoComplete="street-address"
            label="Adresse de l’intervention"
            onChangeText={(value) => updateField('customerAddress', value)}
            placeholder="12 rue des Lilas, 85580 Grues"
            value={report.customerAddress}
          />
          <TextField
            autoComplete="tel"
            inputMode="tel"
            label="Téléphone"
            onChangeText={(value) => updateField('customerPhone', value)}
            placeholder="06 12 34 56 78"
            textContentType="telephoneNumber"
            value={report.customerPhone}
          />
        </SectionCard>

        <FormSection number="01" title="Prestation demandée">
          <ChoiceGroup
            onToggle={(option) => updateMultiChoice('services', option)}
            options={serviceOptions}
            selectedValues={report.services}
          />
        </FormSection>

        <FormSection number="02" title="Rapport d’intervention">
          <ChoiceGroup
            onToggle={(option) => updateMultiChoice('sootTypes', option)}
            options={sootTypeOptions}
            selectedValues={report.sootTypes}
            title="Types de suies"
          />
          <View style={[styles.rule, { backgroundColor: theme.line }]} />
          <ChoiceGroup
            hint="Un seul choix"
            onToggle={(option) => updateField('sootVolume', option)}
            options={sootVolumeOptions}
            selectedValues={report.sootVolume ? [report.sootVolume] : []}
            single
            title="Volume des suies"
          />
          <View style={[styles.rule, { backgroundColor: theme.line }]} />
          <ChoiceGroup
            onToggle={(option) => updateMultiChoice('visibleDefects', option)}
            options={visibleDefectOptions}
            selectedValues={report.visibleDefects}
            title="Défauts apparents"
          />
        </FormSection>

        <FormSection number="03" title="Conseils">
          <ChoiceGroup
            onToggle={(option) => updateMultiChoice('advice', option)}
            options={adviceOptions}
            selectedValues={report.advice}
            title="À remettre au client"
          />
        </FormSection>

        <FormSection number="04" title="Autres observations">
          <TextField
            label="Point particulier relevé sur place"
            multiline
            onChangeText={(value) => updateField('observations', value)}
            placeholder="Facultatif"
            value={report.observations}
          />
        </FormSection>

        <FormSection number="05" title="Photos">
          <PhotoField
            onChange={(photos) => updateField('photos', photos)}
            photos={report.photos}
            reportId={report.id}
          />
        </FormSection>

        <FormSection number="06" title="Signature du client">
          <SignatureField
            onChange={(strokes) => updateField('signature', strokes)}
            strokes={report.signature}
          />
        </FormSection>

        <ThemedText style={[styles.note, { color: theme.textSecondary }]}>
          Une fois enregistré, le rapport ne se modifie plus. Son PDF reste régénérable à tout
          moment.
        </ThemedText>
      </ScrollView>

      {keyboardVisible ? null : (
        <View
          style={[
            styles.bar,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.line,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}>
          <View style={styles.barInner}>
            <PrimaryButton
              accessibilityLabel="Enregistrer sans créer le PDF"
              disabled={busy}
              loading={saving}
              onPress={handleSave}
              style={styles.barSecondary}
              title="Sans PDF"
              variant="secondary"
            />
            <PrimaryButton
              accessibilityLabel="Enregistrer et mettre le PDF dans mes fichiers"
              disabled={busy}
              icon={(color) => <DownloadIcon color={color} size={19} />}
              loading={exporting}
              onPress={handleSaveToFiles}
              style={styles.barPrimary}
              title="Enregistrer + PDF"
            />
          </View>
        </View>
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
    gap: 28,
    paddingHorizontal: 14,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
  },
  headCard: {
    gap: 18,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameRowStacked: {
    flexDirection: 'column',
    gap: 18,
  },
  nameField: {
    flex: 1,
  },
  group: {
    gap: 2,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -18,
  },
  prefill: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: -8,
  },
  note: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: Spacing.one,
    textAlign: 'center',
  },
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 14,
  },
  barInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  barSecondary: {
    paddingHorizontal: 18,
  },
  barPrimary: {
    flex: 1,
  },
});
