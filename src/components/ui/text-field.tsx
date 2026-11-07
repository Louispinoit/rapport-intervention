import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Shown under the field in red, and turns its edge red. */
  error?: string | null;
  emphasis?: boolean;
};

/**
 * A field on a paper form: a label in small capitals, the value large, and an
 * underline that turns red while typing or when something is wrong.
 */
export function TextField({ label, error, emphasis = false, multiline, onFocus, onBlur, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const edge = error ? theme.accent : focused ? theme.accent : theme.lineStrong;

  return (
    <View style={styles.field}>
      <ThemedText style={{ color: focused ? theme.accent : theme.textSecondary }} type="label">
        {label}
      </ThemedText>
      <TextInput
        multiline={multiline}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        placeholderTextColor={theme.textTertiary}
        selectionColor={theme.accent}
        style={[
          styles.input,
          multiline ? styles.multiline : null,
          emphasis ? styles.emphasis : null,
          {
            color: theme.text,
            backgroundColor: focused ? theme.backgroundElement : theme.background,
            borderBottomColor: edge,
          },
        ]}
        {...rest}
      />
      {error ? (
        <ThemedText style={[styles.error, { color: theme.accent }]}>{error}</ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  input: {
    minHeight: 52,
    borderTopLeftRadius: Radius.sm,
    borderTopRightRadius: Radius.sm,
    borderBottomWidth: 2,
    paddingHorizontal: Spacing.three - 4,
    paddingVertical: 10,
    fontFamily: FontFamily.bodySemibold,
    fontSize: 18,
    lineHeight: 24,
  },
  emphasis: {
    fontFamily: FontFamily.display,
    fontSize: 22,
    letterSpacing: 0.4,
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: 'top',
    fontFamily: FontFamily.bodyMedium,
    fontSize: 16,
  },
  error: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
});
