import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { CheckRow } from '@/components/ui/check-row';
import { FormSection, GroupLabel } from '@/components/ui/form-section';
import {
  CheckIcon,
  ChevronRightIcon,
  DownloadIcon,
  ExternalIcon,
  LockIcon,
  PhoneIcon,
  PinIcon,
  RepeatIcon,
} from '@/components/ui/icons';
import { PhotoField } from '@/components/ui/photo-field';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SectionCard } from '@/components/ui/section-card';
import { SkeletonRows } from '@/components/ui/skeleton';
import { FontFamily, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { successHaptic } from '@/lib/haptics';
import {
  chimneyLabel,
  chooseSaveDirectory,
  customerFullName,
  parseInterventionDate,
  saveReportPdf,
  SIGNATURE_BOX,
  type ReportDraft,
} from '@/lib/report';
import { loadReportDraft } from '@/lib/report-store';

/** Abby's web app, which unlike its native app can attach a file to an invoice. */
const ABBY_URL = 'https://my.app-abby.com';

const dayLong = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const STAMP_DURATION = 420;
/** The moment the stamp meets the paper, as a share of the animation. */
const STAMP_IMPACT = 0.62;

/**
 * Played once, right after saving: the stamp drops onto the page, lands a touch
 * flat and settles at its tilt. It accelerates into the paper (a falling object)
 * and eases out of the impact, so the haptic can fire on contact.
 *
 * A style animation rather than an `entering` layout animation: on web the
 * latter pulls the element out of the flow while it plays, and the stamp ended
 * up stuck on top of the customer's name.
 */
const stampLanding = {
  '0%': {
    opacity: 0,
    transform: [{ scale: 1.9 }, { rotate: '-10deg' }],
    animationTimingFunction: 'ease-in' as const,
  },
  [`${STAMP_IMPACT * 100}%`]: {
    opacity: 1,
    transform: [{ scale: 0.94 }, { rotate: '-1deg' }],
    animationTimingFunction: 'ease-out' as const,
  },
  '100%': {
    opacity: 1,
    transform: [{ scale: 1 }, { rotate: '-2deg' }],
  },
};

/** The Abby prompt rises into place; same reason as above for a style animation. */
const promptRise = {
  from: { opacity: 0, transform: [{ translateY: 12 }] },
  to: { opacity: 1, transform: [{ translateY: 0 }] },
};

/** A tappable contact detail: calls the number, or opens the address in Maps. */
function ContactLine({
  icon,
  value,
  onPress,
  label,
}: {
  icon: (color: string) => ReactNode;
  value: string;
  onPress: () => void;
  label: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [
        styles.contact,
        { backgroundColor: pressed ? theme.backgroundSelected : 'transparent' },
      ]}>
      <View style={[styles.contactIcon, { backgroundColor: theme.accentSoft }]}>
        {icon(theme.accent)}
      </View>
      <ThemedText numberOfLines={2} selectable style={styles.contactText}>
        {value}
      </ThemedText>
      <ChevronRightIcon color={theme.textTertiary} />
    </Pressable>
  );
}

/** Saved reports show what was ticked, not the options that were left empty. */
function SelectedList({ title, values }: { title?: string; values: string[] }) {
  const theme = useTheme();

  return (
    <View style={styles.group}>
      {title ? <GroupLabel title={title} /> : null}
      {values.length === 0 ? (
        <ThemedText style={[styles.emptyLine, { color: theme.textTertiary }]}>Rien de coché</ThemedText>
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
  const params = useLocalSearchParams<{ id?: string; exported?: string; saved?: string }>();
  const reducedMotion = useReducedMotion();
  const justSaved = params.saved === '1';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState<ReportDraft | null>(null);
  // Shown on arrival from an export, so it survives the Android share sheet
  // instead of firing while the user is still in another app.
  const [invoicePrompt, setInvoicePrompt] = useState(params.exported === '1');

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

  // The confirmation buzz lands with the stamp, not when the button was pressed.
  useEffect(() => {
    if (!justSaved || loading || !report) {
      return;
    }

    const timer = setTimeout(successHaptic, reducedMotion ? 0 : STAMP_DURATION * STAMP_IMPACT);
    return () => clearTimeout(timer);
  }, [justSaved, loading, report, reducedMotion]);

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
        successHaptic();
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
      <View style={[styles.screen, styles.padded, { backgroundColor: theme.background }]}>
        <SectionCard>
          <SkeletonRows count={2} />
        </SectionCard>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={[styles.screen, styles.padded, { backgroundColor: theme.background }]}>
        <SectionCard style={styles.missingCard}>
          <ThemedText type="heading">Rapport introuvable</ThemedText>
          <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
            Ce rapport n&apos;est plus enregistré sur cet appareil.
          </ThemedText>
          <PrimaryButton
            onPress={() => router.replace('/history')}
            style={styles.fullWidth}
            title="Revenir à l’historique"
          />
        </SectionCard>
      </View>
    );
  }

  const parsedDate = parseInterventionDate(report.interventionDate);
  const dateLine = parsedDate
    ? dayLong.format(parsedDate)
    : report.interventionDate || 'Date non renseignée';
  const customer = customerFullName(report);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
        {invoicePrompt ? (
          <Animated.View
            style={[
              styles.prompt,
              { backgroundColor: theme.text },
              reducedMotion
                ? null
                : {
                    animationName: promptRise,
                    animationDuration: 260,
                    animationTimingFunction: 'ease-out',
                  },
            ]}>
            <View style={styles.promptHead}>
              <View style={[styles.promptCheck, { backgroundColor: theme.accent }]}>
                <CheckIcon color={theme.accentForeground} size={16} />
              </View>
              <ThemedText style={[styles.promptTitle, { color: theme.background }]}>
                PDF enregistré
              </ThemedText>
            </View>
            <ThemedText style={[styles.promptText, { color: theme.background }]}>
              Il reste à créer la facture correspondante dans Abby.
            </ThemedText>
            <View style={styles.promptActions}>
              <PrimaryButton
                icon={(color) => <ExternalIcon color={color} size={18} />}
                onPress={openAbby}
                style={styles.promptPrimary}
                title="Ouvrir Abby"
              />
              <PrimaryButton
                onPress={() => setInvoicePrompt(false)}
                style={styles.promptLater}
                title="Plus tard"
                variant="secondary"
              />
            </View>
          </Animated.View>
        ) : null}

        {/* Document head: who, when, and the stamp that says it is final. */}
        <View style={styles.docHead}>
          <Animated.View
            style={[
              styles.stamp,
              { borderColor: theme.accent },
              justSaved && !reducedMotion
                ? {
                    animationName: stampLanding,
                    animationDuration: STAMP_DURATION,
                    animationFillMode: 'both',
                  }
                : null,
            ]}>
            <LockIcon color={theme.accent} size={13} />
            <ThemedText style={[styles.stampText, { color: theme.accent }]}>Enregistré</ThemedText>
          </Animated.View>
          <ThemedText
            selectable
            style={[styles.customer, !customer && { color: theme.textSecondary }]}>
            {customer || 'Client non renseigné'}
          </ThemedText>
          <ThemedText style={[styles.date, { color: theme.textSecondary }]}>
            Intervention du {dateLine}
          </ThemedText>

          {report.customerAddress || report.customerPhone ? (
            <View style={styles.contacts}>
              {report.customerPhone ? (
                <ContactLine
                  icon={(color) => <PhoneIcon color={color} size={18} />}
                  label={`Appeler ${report.customerPhone}`}
                  onPress={() => Linking.openURL(`tel:${report.customerPhone.replace(/[^\d+]/g, '')}`)}
                  value={report.customerPhone}
                />
              ) : null}
              {report.customerAddress ? (
                <ContactLine
                  icon={(color) => <PinIcon color={color} size={18} />}
                  label={`Ouvrir ${report.customerAddress} dans Maps`}
                  onPress={() =>
                    Linking.openURL(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(report.customerAddress)}`
                    )
                  }
                  value={report.customerAddress}
                />
              ) : null}
            </View>
          ) : null}

          {customer ? (
            <PrimaryButton
              icon={(color) => <RepeatIcon color={color} size={18} />}
              onPress={() => router.push({ pathname: '/report/new', params: { from: report.id } })}
              style={styles.again}
              title="Nouveau rapport pour ce client"
              variant="secondary"
            />
          ) : null}
        </View>

        {report.chimneys.map((chimney, index) => (
          <View key={chimney.id} style={styles.chimney}>
            {/* A single flue reads exactly like reports always did: no heading. */}
            {report.chimneys.length > 1 ? (
              <View style={[styles.chimneyHead, { borderColor: theme.accent }]}>
                <ThemedText style={[styles.chimneyCount, { color: theme.accent }]}>
                  {index + 1} / {report.chimneys.length}
                </ThemedText>
                <ThemedText numberOfLines={2} style={styles.chimneyName}>
                  {chimneyLabel(chimney, index)}
                </ThemedText>
              </View>
            ) : null}

            <FormSection number="01" title="Prestation demandée">
              <SelectedList values={chimney.services} />
            </FormSection>

            <FormSection number="02" title="Rapport d’intervention">
              <SelectedList title="Types de suies" values={chimney.sootTypes} />
              <SelectedList
                title="Volume des suies"
                values={chimney.sootVolume ? [chimney.sootVolume] : []}
              />
              <SelectedList title="Défauts apparents" values={chimney.visibleDefects} />
            </FormSection>

            <FormSection number="03" title="Conseils">
              <SelectedList values={chimney.advice} />
            </FormSection>

            <FormSection number="04" title="Autres observations">
              <ThemedText
                selectable
                style={[
                  styles.body,
                  { color: chimney.observations ? theme.text : theme.textTertiary },
                ]}>
                {chimney.observations || 'Aucune observation complémentaire'}
              </ThemedText>
            </FormSection>
          </View>
        ))}

        <FormSection number="05" title="Photos">
          <PhotoField photos={report.photos} readOnly reportId={report.id} />
        </FormSection>

        <FormSection number="06" title="Signature du client">
          {report.signature.length ? (
            <View
              style={[
                styles.signatureBox,
                { backgroundColor: theme.background, borderColor: theme.line },
              ]}>
              <Svg
                height="100%"
                viewBox={`0 0 ${SIGNATURE_BOX.width} ${SIGNATURE_BOX.height}`}
                width="100%">
                {report.signature.map((stroke, index) => (
                  <Path
                    d={stroke}
                    fill="none"
                    key={index}
                    stroke={theme.text}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                  />
                ))}
              </Svg>
            </View>
          ) : (
            <ThemedText style={[styles.emptyLine, { color: theme.textTertiary }]}>Non signé</ThemedText>
          )}
        </FormSection>

        <ThemedText style={[styles.note, { color: theme.textSecondary }]}>
          Le PDF enregistré s&apos;efface de tes fichiers au bout d&apos;une semaine. Le rapport,
          lui, reste ici : tu peux le réenregistrer à tout moment.
        </ThemedText>
      </ScrollView>

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
            accessibilityLabel="Ouvrir Abby pour la facture"
            onPress={openAbby}
            style={styles.barSecondary}
            title="Abby"
            variant="secondary"
          />
          <PrimaryButton
            accessibilityLabel="Enregistrer le PDF dans mes fichiers"
            icon={(color) => <DownloadIcon color={color} size={19} />}
            loading={saving}
            onPress={handleSaveToFiles}
            style={styles.barPrimary}
            title="PDF dans mes fichiers"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: 14,
    paddingTop: Spacing.two,
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
  chimney: {
    gap: 28,
  },
  // Set like the PDF's band: a red rule, the count, then the flue's name.
  chimneyHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    borderTopWidth: 3,
    paddingTop: 12,
    paddingHorizontal: Spacing.one,
  },
  chimneyCount: {
    fontFamily: FontFamily.displayHeavy,
    fontSize: 15,
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  chimneyName: {
    flex: 1,
    fontFamily: FontFamily.displayHeavy,
    fontSize: 26,
    lineHeight: 30,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  missingCard: {
    gap: Spacing.three,
  },
  body: {
    fontFamily: FontFamily.body,
    fontSize: 16,
    lineHeight: 24,
  },
  prompt: {
    borderRadius: Radius.lg,
    gap: 10,
    padding: 18,
  },
  promptHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  promptCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptTitle: {
    fontFamily: FontFamily.display,
    fontSize: 22,
    lineHeight: 26,
    textTransform: 'uppercase',
  },
  promptText: {
    fontFamily: FontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.85,
  },
  promptActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Spacing.one,
  },
  promptPrimary: {
    flex: 1,
  },
  promptLater: {
    paddingHorizontal: 18,
  },
  docHead: {
    gap: 6,
    paddingHorizontal: Spacing.one,
    paddingTop: Spacing.two,
  },
  stamp: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: Spacing.two,
    transform: [{ rotate: '-2deg' }],
  },
  stampText: {
    fontFamily: FontFamily.display,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  customer: {
    fontFamily: FontFamily.displayHeavy,
    fontSize: 40,
    lineHeight: 40,
    letterSpacing: -0.4,
    textTransform: 'uppercase',
  },
  contacts: {
    marginTop: Spacing.two,
    marginHorizontal: -Spacing.one,
  },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: Spacing.one,
    paddingVertical: 6,
    borderRadius: Radius.md,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: {
    flex: 1,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 15,
    lineHeight: 21,
  },
  again: {
    marginTop: Spacing.three,
  },
  date: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  group: {
    gap: 2,
  },
  emptyLine: {
    fontFamily: FontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  signatureBox: {
    width: '100%',
    aspectRatio: SIGNATURE_BOX.width / SIGNATURE_BOX.height,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
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
    paddingHorizontal: 22,
  },
  barPrimary: {
    flex: 1,
  },
  fullWidth: {
    width: '100%',
  },
});
