import type { ReactNode } from 'react';
import { ActivityIndicator, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PrimaryButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'solid' | 'secondary';
  disabled?: boolean;
  /** Replaces the icon with a spinner and blocks presses. */
  loading?: boolean;
  /** Renders inside its own round well at the trailing edge. */
  icon?: (color: string) => ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  title,
  onPress,
  variant = 'solid',
  disabled = false,
  loading = false,
  icon,
  accessibilityLabel,
  style,
}: PrimaryButtonProps) {
  const theme = useTheme();
  const isSolid = variant === 'solid';
  const inactive = disabled || loading;
  const foreground = isSolid ? theme.accentForeground : theme.text;

  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        icon || loading ? styles.withIcon : null,
        isSolid
          ? {
              backgroundColor: pressed ? theme.accentPressed : theme.accent,
              // The shadow flattens under the finger, as if the button were pushed in.
              boxShadow: pressed || inactive ? 'none' : theme.shadowAccent,
            }
          : {
              backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
              borderColor: theme.lineStrong,
              borderWidth: StyleSheet.hairlineWidth * 2,
            },
        disabled && !loading ? styles.disabled : null,
        style,
      ]}>
      <ThemedText numberOfLines={1} style={[styles.label, { color: foreground }]}>
        {title}
      </ThemedText>
      {icon || loading ? (
        <View
          style={[
            styles.well,
            {
              backgroundColor: isSolid ? 'rgba(255,255,255,0.16)' : theme.backgroundSelected,
            },
          ]}>
          {loading ? <ActivityIndicator color={foreground} size="small" /> : icon?.(foreground)}
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  withIcon: {
    justifyContent: 'space-between',
    paddingLeft: Spacing.four,
    paddingRight: 8,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  well: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
