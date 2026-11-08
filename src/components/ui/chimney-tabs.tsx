import { useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { PlusIcon } from '@/components/ui/icons';
import { PressableScale } from '@/components/ui/pressable-scale';
import { FontFamily, Motion, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { tickHaptic } from '@/lib/haptics';

type Tab = { id: string; label: string; done: boolean };

type ChimneyTabsProps = {
  tabs: Tab[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Absent once the report holds as many flues as it can. */
  onAdd?: () => void;
};

/**
 * One tab per flue, so the form shows a single questionnaire at a time. The dot
 * says at a glance which flue still lacks its service or findings.
 */
export function ChimneyTabs({ tabs, activeId, onSelect, onAdd }: ChimneyTabsProps) {
  const theme = useTheme();
  const scroller = useRef<ScrollView>(null);

  return (
    <ScrollView
      contentContainerStyle={styles.row}
      horizontal
      ref={scroller}
      showsHorizontalScrollIndicator={false}
      style={styles.scroller}>
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        const ink = active ? theme.accentForeground : theme.text;

        return (
          <PressableScale
            accessibilityLabel={`${tab.label}, ${tab.done ? 'complet' : 'à compléter'}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={tab.id}
            onPress={() => {
              if (!active) {
                tickHaptic();
                onSelect(tab.id);
              }
            }}>
            <Animated.View
              style={[
                styles.tab,
                {
                  backgroundColor: active ? theme.accent : theme.backgroundElement,
                  borderColor: active ? theme.accent : theme.line,
                  transitionProperty: ['backgroundColor', 'borderColor'],
                  transitionDuration: Motion.state,
                  transitionTimingFunction: 'ease-out',
                },
              ]}>
              <View
                style={[
                  styles.dot,
                  tab.done
                    ? { backgroundColor: active ? theme.accentForeground : theme.accent }
                    : { borderColor: active ? theme.accentForeground : theme.lineStrong, borderWidth: 1.5 },
                ]}
              />
              <ThemedText numberOfLines={1} style={[styles.label, { color: ink }]}>
                {tab.label}
              </ThemedText>
            </Animated.View>
          </PressableScale>
        );
      })}
      {onAdd ? (
        <PressableScale
          accessibilityLabel="Ajouter un conduit"
          accessibilityRole="button"
          onPress={() => {
            tickHaptic();
            onAdd();
            // The new tab lands at the end: bring it into view.
            requestAnimationFrame(() => scroller.current?.scrollToEnd({ animated: true }));
          }}>
          <View style={[styles.tab, styles.add, { borderColor: theme.lineStrong }]}>
            <PlusIcon color={theme.accent} size={18} />
            <ThemedText style={[styles.label, { color: theme.accent }]}>Conduit</ThemedText>
          </View>
        </PressableScale>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Bleeds to the screen edge so a long row scrolls under the gutter, not into it.
  scroller: {
    marginHorizontal: -14,
    flexGrow: 0,
  },
  row: {
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  tab: {
    minHeight: 48,
    maxWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  add: {
    borderStyle: 'dashed',
    paddingHorizontal: 14,
    gap: 4,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  label: {
    fontFamily: FontFamily.display,
    fontSize: 17,
    lineHeight: 22,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    flexShrink: 1,
  },
});
