import { useRef } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

import { ThemedText } from '@/components/themed-text';
import { ChevronRightIcon, TrashIcon } from '@/components/ui/icons';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { customerFullName, reportDate, type ReportSummary } from '@/lib/report';

type ReportRowProps = {
  report: ReportSummary;
  onPress: () => void;
  /** Passing this enables swipe-to-delete. */
  onDelete?: () => void;
  showDivider?: boolean;
  /** Horizontal padding inside the row; a full-bleed list passes its sheet padding here. */
  inset?: number;
};

const ACTION_WIDTH = 96;

const monthShort = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
const dayLong = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function ReportRow({
  report,
  onPress,
  onDelete,
  showDivider = true,
  inset = Spacing.one,
}: ReportRowProps) {
  const theme = useTheme();
  const swipeable = useRef<SwipeableMethods>(null);
  const date = reportDate(report);
  const hasDate = date.getTime() > 0;
  const customer = customerFullName(report);
  const title = customer || 'Client non renseigné';
  const details = hasDate ? dayLong.format(date) : report.interventionDate;

  function confirmDelete() {
    const question = 'Supprimer ce rapport ?';
    const consequence = `${title} sera définitivement effacé, et son PDF ne pourra plus être régénéré.`;

    // Alert.alert is a silent no-op in the browser, so the web build asks with
    // the browser's own confirm dialog instead.
    if (Platform.OS === 'web') {
      if (window.confirm(`${question}\n\n${consequence}`)) {
        onDelete?.();
      } else {
        swipeable.current?.close();
      }
      return;
    }

    Alert.alert(question, consequence, [
      { text: 'Annuler', style: 'cancel', onPress: () => swipeable.current?.close() },
      { text: 'Supprimer', style: 'destructive', onPress: onDelete },
    ]);
  }

  const row = (
    <Pressable
      accessibilityHint="Ouvre le rapport"
      accessibilityLabel={`${title}, ${details}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { paddingHorizontal: inset },
        { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
        showDivider && {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.line,
        },
      ]}>
      {/* The date as a ticket stub, the way a carnet is scanned: by day. */}
      <View style={[styles.stub, { backgroundColor: theme.background, borderColor: theme.line }]}>
        <ThemedText style={styles.stubDay}>{hasDate ? date.getDate() : '?'}</ThemedText>
        <ThemedText style={[styles.stubMonth, { color: theme.accent }]}>
          {hasDate ? monthShort.format(date).replace('.', '') : ''}
        </ThemedText>
      </View>
      <View style={styles.main}>
        <ThemedText
          numberOfLines={1}
          style={[styles.title, !customer && { color: theme.textSecondary }]}>
          {title}
        </ThemedText>
        <ThemedText numberOfLines={1} style={[styles.details, { color: theme.textSecondary }]}>
          {details}
        </ThemedText>
      </View>
      <ChevronRightIcon color={theme.textTertiary} />
    </Pressable>
  );

  if (!onDelete) {
    return row;
  }

  return (
    <ReanimatedSwipeable
      friction={2}
      overshootRight={false}
      ref={swipeable}
      renderRightActions={() => (
        <Pressable
          accessibilityLabel={`Supprimer le rapport ${title}`}
          accessibilityRole="button"
          onPress={confirmDelete}
          style={({ pressed }) => [
            styles.action,
            { backgroundColor: pressed ? theme.accentPressed : theme.accent },
          ]}>
          <TrashIcon color={theme.accentForeground} />
          <ThemedText style={[styles.actionText, { color: theme.accentForeground }]}>
            Supprimer
          </ThemedText>
        </Pressable>
      )}
      rightThreshold={ACTION_WIDTH / 2}>
      {row}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 72,
    paddingVertical: 12,
    paddingHorizontal: Spacing.one,
  },
  stub: {
    width: 50,
    height: 50,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stubDay: {
    fontFamily: FontFamily.displayHeavy,
    fontVariant: ['tabular-nums'],
    fontSize: 22,
    lineHeight: 22,
  },
  stubMonth: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  main: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: FontFamily.bodySemibold,
    fontSize: 17,
    lineHeight: 22,
  },
  details: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    lineHeight: 18,
  },
  action: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 12,
    lineHeight: 16,
  },
});
