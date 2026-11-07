import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ReminderRow } from '@/components/ui/reminder-row';
import { SectionCard } from '@/components/ui/section-card';
import { SkeletonRows } from '@/components/ui/skeleton';
import { FontFamily, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dismissReminder, listDueClients, type DueClient } from '@/lib/reminders';
import { listReportDrafts } from '@/lib/report-store';

export default function RemindersScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const theme = useTheme();
  const [due, setDue] = useState<DueClient[] | null>(null);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    let cancelled = false;
    listReportDrafts()
      .then((reports) => listDueClients(reports))
      .then((clients) => {
        if (!cancelled) {
          setDue(clients);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDue([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isFocused]);

  async function hide(key: string) {
    setDue((current) => current?.filter((client) => client.key !== key) ?? null);
    await dismissReminder(key);
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {due === null ? (
        <View style={styles.content}>
          <SectionCard>
            <SkeletonRows count={4} />
          </SectionCard>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.content}
          data={due}
          keyExtractor={(client) => client.key}
          ListEmptyComponent={
            <SectionCard style={styles.emptyCard}>
              <ThemedText type="heading">Personne à relancer</ThemedText>
              <ThemedText style={[styles.lead, { color: theme.textSecondary }]}>
                Un client apparaît ici quand son dernier ramonage date de plus de 11 mois.
              </ThemedText>
            </SectionCard>
          }
          ListHeaderComponent={
            due.length > 0 ? (
              <ThemedText style={[styles.lead, styles.leadHeader, { color: theme.textSecondary }]}>
                Du plus ancien au plus récent. Le + commence un rapport avec ses coordonnées, la
                croix le masque jusqu’à son prochain rapport.
              </ThemedText>
            ) : null
          }
          renderItem={({ item, index }) => (
            <View
              style={[
                styles.sheetRow,
                { backgroundColor: theme.backgroundElement, borderColor: theme.line },
                index === 0 && styles.sheetFirst,
                index === due.length - 1 && styles.sheetLast,
              ]}>
              <ReminderRow
                client={item}
                onDismiss={() => hide(item.key)}
                onNewReport={() =>
                  router.push({ pathname: '/report/new', params: { from: item.lastReportId } })
                }
                showDivider={index > 0}
              />
            </View>
          )}
          style={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
  },
  emptyCard: {
    gap: Spacing.three,
  },
  lead: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
  },
  leadHeader: {
    paddingHorizontal: Spacing.one,
    paddingBottom: Spacing.three,
  },
  sheetRow: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
  },
  sheetFirst: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: 4,
  },
  sheetLast: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
    paddingBottom: 4,
  },
});
