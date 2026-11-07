import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CloseIcon, PhoneIcon, PlusIcon } from '@/components/ui/icons';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DueClient } from '@/lib/reminders';

const monthYear = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const monthYearShort = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' });

type ReminderRowProps = {
  client: DueClient;
  onNewReport: () => void;
  onDismiss: () => void;
  showDivider?: boolean;
};

/**
 * A client due for their yearly sweep: call them, start their next report with
 * their details already filled in, or hide them (moved, sweeps elsewhere...).
 */
export function ReminderRow({ client, onNewReport, onDismiss, showDivider = true }: ReminderRowProps) {
  const theme = useTheme();
  const last = monthYear.format(client.lastDate);

  return (
    <View
      style={[
        styles.row,
        showDivider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
      ]}>
      <Pressable
        accessibilityHint="Commence un rapport avec ses coordonnées"
        accessibilityLabel={`${client.name}, dernier ramonage en ${last}`}
        accessibilityRole="button"
        onPress={onNewReport}
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.6 }]}>
        <ThemedText numberOfLines={1} style={styles.name}>
          {client.name}
        </ThemedText>
        <ThemedText numberOfLines={2} style={[styles.detail, { color: theme.textSecondary }]}>
          Dernier passage : {monthYearShort.format(client.lastDate)}
        </ThemedText>
      </Pressable>

      {client.phone ? (
        <Pressable
          accessibilityLabel={`Appeler ${client.name}`}
          accessibilityRole="button"
          hitSlop={4}
          onPress={() => Linking.openURL(`tel:${client.phone.replace(/[^\d+]/g, '')}`)}
          style={({ pressed }) => [
            styles.action,
            { backgroundColor: pressed ? theme.accentPressed : theme.accent },
          ]}>
          <PhoneIcon color={theme.accentForeground} size={18} />
        </Pressable>
      ) : null}
      <Pressable
        accessibilityLabel={`Nouveau rapport pour ${client.name}`}
        accessibilityRole="button"
        hitSlop={4}
        onPress={onNewReport}
        style={({ pressed }) => [
          styles.action,
          { backgroundColor: pressed ? theme.backgroundSelected : theme.background, borderColor: theme.line },
          styles.outlined,
        ]}>
        <PlusIcon color={theme.text} size={18} />
      </Pressable>
      <Pressable
        accessibilityLabel={`Ne plus rappeler ${client.name} cette année`}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onDismiss}
        style={({ pressed }) => [styles.dismiss, pressed && { opacity: 0.5 }]}>
        <CloseIcon color={theme.textTertiary} size={14} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 64,
    paddingVertical: 8,
    paddingHorizontal: Spacing.one,
  },
  main: {
    flex: 1,
    gap: 2,
    paddingVertical: 4,
  },
  name: {
    fontFamily: FontFamily.bodySemibold,
    fontSize: 16,
    lineHeight: 21,
  },
  detail: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    lineHeight: 18,
  },
  action: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlined: {
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  dismiss: {
    width: 28,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
