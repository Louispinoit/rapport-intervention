import * as Updates from 'expo-updates';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Shown once a new version has finished downloading. expo-updates applies an
 * update on the next launch, so without this the user runs the old version and
 * has no idea a fix is already waiting.
 */
export function UpdateBanner() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isUpdatePending } = Updates.useUpdates();
  const [restarting, setRestarting] = useState(false);

  if (!isUpdatePending) {
    return null;
  }

  async function restart() {
    setRestarting(true);
    try {
      await Updates.reloadAsync();
    } catch {
      // Rejects in development builds, and there is nothing useful to say if the
      // reload itself fails — the update still applies on the next launch.
      setRestarting(false);
    }
  }

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: theme.text, paddingTop: insets.top + Spacing.two },
      ]}>
      <ThemedText style={[styles.text, { color: theme.background }]}>
        Une mise à jour est prête.
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        disabled={restarting}
        onPress={restart}
        style={({ pressed }) => [
          styles.action,
          { backgroundColor: theme.accent, opacity: pressed || restarting ? 0.7 : 1 },
        ]}>
        <ThemedText style={[styles.actionText, { color: theme.accentForeground }]}>
          {restarting ? 'Redémarrage…' : 'Redémarrer'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  text: {
    flexShrink: 1,
    fontFamily: FontFamily.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  action: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
  },
  actionText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 14,
    lineHeight: 20,
  },
});
