import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SectionCard } from '@/components/ui/section-card';
import { APP_LABEL, COMPANY_NAME } from '@/constants/company';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const reportContents = [
  {
    number: '01',
    title: 'Prestation demandée',
    body: 'Cases à cocher pour ramonage, débistrage, diagnostic, entretien appareil ou autres.',
  },
  {
    number: '02',
    title: "Rapport d'intervention",
    body: 'Types de suies, volume, défauts apparents et observations terrain.',
  },
  {
    number: '03',
    title: 'Conseils',
    body: "Préconisations à remettre au client selon l'état de l'installation.",
  },
  {
    number: '04',
    title: 'Autres observations',
    body: 'Zone libre pour noter un point particulier en fin de rapport.',
  },
];

const steps = [
  { n: '1', text: 'Ouvrir un nouveau rapport depuis le téléphone.' },
  { n: '2', text: "Compléter la prestation, le rapport d'intervention et les conseils." },
  { n: '3', text: "Enregistrer ou exporter le PDF d'intervention immédiatement." },
];

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const isCompact = width < 430;
  const isVeryCompact = width < 360;
  const horizontalPadding = isCompact ? Spacing.three : Spacing.four;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}>

          {/* Hero card */}
          <SectionCard style={styles.heroCard}>
            <View style={[styles.companyBadge, { backgroundColor: theme.accentSoft, borderColor: theme.backgroundSelected }]}>
              <ThemedText style={[styles.companyText, { color: theme.accent }]}>{COMPANY_NAME}</ThemedText>
            </View>
            <ThemedText
              type="title"
              style={[
                styles.title,
                isCompact && styles.titleCompact,
                isVeryCompact && styles.titleVeryCompact,
              ]}>
              {APP_LABEL}
            </ThemedText>
            <ThemedText
              themeColor="textSecondary"
              style={[styles.lead, isCompact && styles.leadCompact]}>
              Saisie rapide de la prestation, du rapport d&apos;intervention, des conseils et PDF prêt à
              partager depuis le téléphone.
            </ThemedText>
            <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
            <View style={styles.actions}>
              <PrimaryButton
                onPress={() => router.push('/report/new')}
                style={styles.fullWidth}
                title="Créer un rapport"
              />
              <PrimaryButton
                onPress={() => router.push('/history')}
                title="Rapports enregistrés"
                variant="secondary"
                style={styles.fullWidth}
              />
            </View>
          </SectionCard>

          {/* Features card */}
          <SectionCard>
            <ThemedText style={[styles.sectionTitle, isCompact && styles.sectionTitleCompact]}>
              Le document comprend
            </ThemedText>
            <View style={styles.featureGrid}>
              {reportContents.map((feature) => (
                <View key={feature.title} style={[styles.featureItem, { borderColor: theme.backgroundSelected }]}>
                  <ThemedText style={[styles.featureNumber, { color: theme.accent }]}>{feature.number}</ThemedText>
                  <View style={styles.featureBody}>
                    <ThemedText style={styles.featureTitle}>{feature.title}</ThemedText>
                    <ThemedText themeColor="textSecondary" style={styles.featureText}>{feature.body}</ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </SectionCard>

          {/* Usage card */}
          <SectionCard>
            <ThemedText style={[styles.sectionTitle, isCompact && styles.sectionTitleCompact]}>
              Comment utiliser
            </ThemedText>
            <View style={styles.stepsGrid}>
              {steps.map((step) => (
                <View key={step.n} style={styles.stepRow}>
                  <View style={[styles.stepBadge, { backgroundColor: theme.accent }]}>
                    <ThemedText style={[styles.stepNumber, { color: theme.accentForeground }]}>{step.n}</ThemedText>
                  </View>
                  <ThemedText style={styles.stepText}>{step.text}</ThemedText>
                </View>
              ))}
            </View>
          </SectionCard>

        </ScrollView>
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
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.five,
  },
  heroCard: {
    gap: Spacing.three,
  },
  companyBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half + 2,
  },
  companyText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '700',
    width: '100%',
  },
  titleCompact: {
    fontSize: 30,
    lineHeight: 34,
  },
  titleVeryCompact: {
    fontSize: 26,
    lineHeight: 30,
  },
  lead: {
    fontSize: 17,
    lineHeight: 26,
    width: '100%',
  },
  leadCompact: {
    fontSize: 16,
    lineHeight: 24,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.half,
  },
  actions: {
    gap: Spacing.two,
  },
  fullWidth: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  sectionTitleCompact: {
    fontSize: 20,
    lineHeight: 26,
  },
  featureGrid: {
    gap: Spacing.two,
  },
  featureItem: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
  },
  featureNumber: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 22,
    width: 20,
    textAlign: 'right',
    letterSpacing: 0.5,
  },
  featureBody: {
    flex: 1,
    gap: Spacing.half,
  },
  featureTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  featureText: {
    fontSize: 14,
    lineHeight: 21,
  },
  stepsGrid: {
    gap: Spacing.three,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
});
