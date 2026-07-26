import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SIGNATURE_BOX } from '@/lib/report';

type SignaturePadProps = {
  strokes: string[];
  onChange: (strokes: string[]) => void;
};

const PAD_HEIGHT = 180;

function round(value: number) {
  return Math.round(value * 10) / 10;
}

export function SignaturePad({ strokes, onChange }: SignaturePadProps) {
  const theme = useTheme();
  const [size, setSize] = useState({ width: 0, height: PAD_HEIGHT });
  const [current, setCurrent] = useState<string | null>(null);

  // Refs, not state: the pan handlers are created once and must not close over
  // a stale render's values.
  const sizeRef = useRef(size);
  const strokesRef = useRef(strokes);
  const pointsRef = useRef<string[]>([]);
  sizeRef.current = size;
  strokesRef.current = strokes;

  /** Captured in SIGNATURE_BOX units so the PDF replays the stroke identically. */
  function toBox(x: number, y: number) {
    const { width, height } = sizeRef.current;
    if (!width || !height) {
      return null;
    }

    return {
      x: round((x / width) * SIGNATURE_BOX.width),
      y: round((y / height) * SIGNATURE_BOX.height),
    };
  }

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the scroll view from stealing the gesture mid-signature.
      onPanResponderTerminationRequest: () => false,
      onStartShouldSetPanResponderCapture: () => true,

      onPanResponderGrant: (event) => {
        const point = toBox(event.nativeEvent.locationX, event.nativeEvent.locationY);
        if (!point) {
          return;
        }

        pointsRef.current = [`M${point.x} ${point.y}`];
        setCurrent(pointsRef.current.join(' '));
      },

      onPanResponderMove: (event) => {
        const point = toBox(event.nativeEvent.locationX, event.nativeEvent.locationY);
        if (!point || pointsRef.current.length === 0) {
          return;
        }

        pointsRef.current.push(`L${point.x} ${point.y}`);
        setCurrent(pointsRef.current.join(' '));
      },

      onPanResponderRelease: () => {
        if (pointsRef.current.length > 1) {
          onChange([...strokesRef.current, pointsRef.current.join(' ')]);
        }

        pointsRef.current = [];
        setCurrent(null);
      },
    })
  ).current;

  function handleLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  }

  const isEmpty = strokes.length === 0 && !current;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Signature du client
        </ThemedText>
        {strokes.length > 0 ? (
          <ThemedText
            accessibilityRole="button"
            onPress={() => onChange([])}
            style={[styles.clear, { color: theme.accent }]}>
            Effacer
          </ThemedText>
        ) : null}
      </View>

      <View
        {...responder.panHandlers}
        onLayout={handleLayout}
        style={[
          styles.pad,
          { backgroundColor: theme.background, borderColor: theme.backgroundSelected },
        ]}>
        <Svg
          height="100%"
          viewBox={`0 0 ${SIGNATURE_BOX.width} ${SIGNATURE_BOX.height}`}
          width="100%">
          {[...strokes, ...(current ? [current] : [])].map((stroke, index) => (
            <Path
              d={stroke}
              key={index}
              stroke={theme.text}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              fill="none"
            />
          ))}
        </Svg>
        {isEmpty ? (
          <ThemedText themeColor="textSecondary" style={styles.hint} pointerEvents="none">
            Faire signer le client ici
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  label: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clear: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  pad: {
    borderWidth: 1,
    borderRadius: Radius.md,
    height: PAD_HEIGHT,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  hint: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
