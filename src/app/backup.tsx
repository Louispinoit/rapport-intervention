import { useIsFocused } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ArchiveIcon, DownloadIcon } from '@/components/ui/icons';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SectionCard } from '@/components/ui/section-card';
import { FontFamily, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { exportBackup, getLastBackupDate, restoreBackup } from '@/lib/backup';
import { successHaptic } from '@/lib/haptics';

const longDate = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default function BackupScreen() {
  const theme = useTheme();
  const isFocused = useIsFocused();
  const [lastBackup, setLastBackup] = useState<Date | null>(null);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isFocused) {
      getLastBackupDate().then(setLastBackup).catch(() => undefined);
    }
  }, [isFocused]);

  async function handleExport() {
    setExporting(true);
    setMessage(null);
    try {
      const result = await exportBackup();
      if (result.shared) {
        successHaptic();
        setLastBackup(new Date());
        setMessage(
          `${result.count} rapport${result.count > 1 ? 's' : ''} dans le fichier. Garde-le hors du téléphone : Drive, ou envoyé par mail.`
        );
      }
    } catch (error) {
      Alert.alert('Sauvegarde impossible', error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setExporting(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    setMessage(null);
    try {
      const result = await restoreBackup();
      if (result.status === 'restored') {
        successHaptic();
        const added = `${result.added} rapport${result.added > 1 ? 's' : ''} ajouté${result.added > 1 ? 's' : ''}`;
        const skipped = result.skipped
          ? `, ${result.skipped} déjà présent${result.skipped > 1 ? 's' : ''} sur le téléphone`
          : '';
        setMessage(`${added}${skipped}.`);
      }
    } catch (error) {
      Alert.alert('Restauration impossible', error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setRestoring(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={[styles.screen, { backgroundColor: theme.background }]}>
      <ThemedText style={[styles.lead, { color: theme.textSecondary }]}>
        Les rapports ne sont enregistrés que sur ce téléphone. S’il est perdu ou cassé, seule une
        sauvegarde permet de les retrouver.
      </ThemedText>

      <SectionCard style={styles.card}>
        <ThemedText style={{ color: theme.textSecondary }} type="label">
          Dernière sauvegarde
        </ThemedText>
        <ThemedText style={styles.when}>
          {lastBackup ? longDate.format(lastBackup) : 'Jamais'}
        </ThemedText>
        <PrimaryButton
          disabled={restoring}
          icon={(color) => <ArchiveIcon color={color} size={19} />}
          loading={exporting}
          onPress={handleExport}
          style={styles.fullWidth}
          title="Sauvegarder les rapports"
        />
        <ThemedText style={[styles.note, { color: theme.textSecondary }]}>
          Un seul fichier avec tous les rapports, photos comprises. Choisis Drive ou ton mail dans
          le menu qui s’ouvre.
        </ThemedText>
      </SectionCard>

      <SectionCard style={styles.card}>
        <ThemedText style={{ color: theme.textSecondary }} type="label">
          Restaurer
        </ThemedText>
        <ThemedText style={[styles.note, { color: theme.textSecondary }]}>
          Sur un nouveau téléphone, ou après une réinstallation : choisis le fichier de
          sauvegarde. Les rapports déjà présents ne sont ni modifiés ni dupliqués.
        </ThemedText>
        <PrimaryButton
          disabled={exporting}
          icon={(color) => <DownloadIcon color={color} size={19} />}
          loading={restoring}
          onPress={handleRestore}
          style={styles.fullWidth}
          title="Restaurer une sauvegarde"
          variant="secondary"
        />
      </SectionCard>

      {message ? (
        <View style={[styles.result, { backgroundColor: theme.accentSoft }]}>
          <ThemedText style={styles.resultText}>{message}</ThemedText>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.four,
    paddingHorizontal: 14,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
  },
  lead: {
    fontFamily: FontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: Spacing.one,
  },
  card: {
    gap: 12,
  },
  when: {
    fontFamily: FontFamily.display,
    fontSize: 24,
    lineHeight: 28,
    textTransform: 'uppercase',
    marginBottom: Spacing.one,
  },
  note: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    lineHeight: 19,
  },
  result: {
    borderRadius: 14,
    padding: Spacing.three,
  },
  resultText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  fullWidth: {
    width: '100%',
  },
});
