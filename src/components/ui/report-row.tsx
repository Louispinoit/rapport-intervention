import { useRef } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Svg, { Path, Rect } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { customerFullName, type ReportSummary } from '@/lib/report';

type ReportRowProps = {
  report: ReportSummary;
  onPress: () => void;
  /** Passing this enables swipe-to-delete. */
  onDelete?: () => void;
  showDivider?: boolean;
};

const ACTION_WIDTH = 92;

function formatUpdatedAt(value: string) {
  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(parsed);
}

function TrashIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M4 6.5h16" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M9.5 6.5V4.5h5v2" stroke={color} strokeWidth={2} strokeLinejoin="round" fill="none" />
      <Path
        d="M6.5 6.5l1 13h9l1-13"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        fill="none"
      />
      <Rect x={10.6} y={9.5} width={1.2} height={7} rx={0.6} fill={color} />
      <Rect x={13.2} y={9.5} width={1.2} height={7} rx={0.6} fill={color} />
    </Svg>
  );
}

export function ReportRow({ report, onPress, onDelete, showDivider = true }: ReportRowProps) {
  const theme = useTheme();
  const swipeable = useRef<SwipeableMethods>(null);
  const savedAt = formatUpdatedAt(report.updatedAt);
  const customer = customerFullName(report);
  const date = report.interventionDate || savedAt;
  const title = customer || `Intervention du ${date}`;
  const details = customer ? `Intervention du ${date}` : '';

  function confirmDelete() {
    Alert.alert(
      'Supprimer ce rapport ?',
      `${title} sera définitivement effacé, avec la possibilité d'en régénérer le PDF.`,
      [
        { text: 'Annuler', style: 'cancel', onPress: () => swipeable.current?.close() },
        { text: 'Supprimer', style: 'destructive', onPress: onDelete },
      ]
    );
  }

  const row = (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundElement },
        showDivider && {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.backgroundSelected,
        },
        pressed && { backgroundColor: theme.accentSoft },
      ]}>
      <View style={styles.main}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        {details ? (
          <ThemedText themeColor="textSecondary" style={styles.details}>
            {details}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText style={[styles.chevron, { color: theme.textSecondary }]}>›</ThemedText>
    </Pressable>
  );

  if (!onDelete) {
    return row;
  }

  return (
    <ReanimatedSwipeable
      containerStyle={styles.swipeContainer}
      friction={2}
      ref={swipeable}
      renderRightActions={() => (
        <Pressable
          accessibilityLabel={`Supprimer le rapport ${title}`}
          accessibilityRole="button"
          onPress={confirmDelete}
          style={({ pressed }) => [
            styles.action,
            { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 },
          ]}>
          <TrashIcon color={theme.accentForeground} />
          <ThemedText style={[styles.actionText, { color: theme.accentForeground }]}>
            Supprimer
          </ThemedText>
        </Pressable>
      )}
      rightThreshold={ACTION_WIDTH / 2}
      overshootRight={false}>
      {row}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    borderRadius: Radius.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 60,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.sm,
  },
  main: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  details: {
    fontSize: 13,
    lineHeight: 18,
  },
  chevron: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '300',
  },
  action: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    borderRadius: Radius.sm,
  },
  actionText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
});
