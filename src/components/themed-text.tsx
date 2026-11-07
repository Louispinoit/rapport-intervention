import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { FontFamily, Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'heading'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'label'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'], flexShrink: 1 },
        styles[type],
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 16,
    lineHeight: 24,
  },
  small: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 14,
    lineHeight: 20,
  },
  /** Livery lettering: condensed, uppercase, tight. */
  title: {
    fontFamily: FontFamily.displayHeavy,
    fontSize: 44,
    lineHeight: 44,
    letterSpacing: -0.4,
    textTransform: 'uppercase',
  },
  heading: {
    fontFamily: FontFamily.display,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: 0.1,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontFamily: FontFamily.bodySemibold,
    fontSize: 20,
    lineHeight: 26,
  },
  /** Small spaced capitals above a field or a group. */
  label: {
    fontFamily: FontFamily.bodySemibold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  link: {
    fontFamily: FontFamily.bodySemibold,
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    fontFamily: FontFamily.bodySemibold,
    lineHeight: 30,
    fontSize: 14,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
