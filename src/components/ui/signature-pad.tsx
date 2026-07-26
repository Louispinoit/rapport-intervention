import { useRef, useState } from 'react';
import { Modal, PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SIGNATURE_BOX } from '@/lib/report';

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function Strokes({ strokes, color }: { strokes: string[]; color: string }) {
  return (
    <Svg height="100%" viewBox={`0 0 ${SIGNATURE_BOX.width} ${SIGNATURE_BOX.height}`} width="100%">
      {strokes.map((stroke, index) => (
        <Path
          d={stroke}
          fill="none"
          key={index}
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
        />
      ))}
    </Svg>
  );
}

/**
 * The drawing surface. It claims any touch that lands on it, which is only safe
 * because it lives in a modal with nothing scrollable behind it — inside the form
 * it captured the scroll gestures and drew stray marks.
 */
function SignatureCanvas({
  strokes,
  onAddStroke,
}: {
  strokes: string[];
  onAddStroke: (stroke: string) => void;
}) {
  const theme = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [current, setCurrent] = useState<string | null>(null);

  // Refs, not state: the handlers are built once and must not read a stale render.
  const sizeRef = useRef(size);
  const pointsRef = useRef<string[]>([]);
  sizeRef.current = size;

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
      onPanResponderTerminationRequest: () => false,

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
          onAddStroke(pointsRef.current.join(' '));
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

  const visible = current ? [...strokes, current] : strokes;

  return (
    <View
      {...responder.panHandlers}
      onLayout={handleLayout}
      style={[
        styles.canvas,
        { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
      ]}>
      <Strokes color={theme.text} strokes={visible} />
      {visible.length === 0 ? (
        <ThemedText themeColor="textSecondary" style={styles.canvasHint} pointerEvents="none">
          Signer avec le doigt
        </ThemedText>
      ) : null}
    </View>
  );
}

type SignatureFieldProps = {
  strokes: string[];
  onChange: (strokes: string[]) => void;
};

export function SignatureField({ strokes, onChange }: SignatureFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);

  function start() {
    setDraft(strokes);
    setOpen(true);
  }

  function confirm() {
    onChange(draft);
    setOpen(false);
  }

  return (
    <View style={styles.field}>
      {strokes.length > 0 ? (
        <View style={[styles.preview, { borderColor: theme.backgroundSelected }]}>
          <Strokes color={theme.text} strokes={strokes} />
        </View>
      ) : (
        <ThemedText themeColor="textSecondary" style={styles.empty}>
          Le client n&apos;a pas encore signé.
        </ThemedText>
      )}

      <PrimaryButton
        onPress={start}
        style={styles.fullWidth}
        title={strokes.length > 0 ? 'Refaire la signature' : 'Faire signer le client'}
        variant={strokes.length > 0 ? 'secondary' : 'solid'}
      />

      <Modal animationType="slide" onRequestClose={() => setOpen(false)} visible={open}>
        <ThemedView style={styles.modal}>
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Signature du client</ThemedText>
              {draft.length > 0 ? (
                <ThemedText
                  accessibilityRole="button"
                  onPress={() => setDraft([])}
                  style={[styles.clear, { color: theme.accent }]}>
                  Effacer
                </ThemedText>
              ) : null}
            </View>

            <SignatureCanvas
              onAddStroke={(stroke) => setDraft((current) => [...current, stroke])}
              strokes={draft}
            />

            <View style={styles.modalActions}>
              <PrimaryButton
                onPress={() => setOpen(false)}
                style={styles.modalButton}
                title="Annuler"
                variant="secondary"
              />
              <PrimaryButton onPress={confirm} style={styles.modalButton} title="Valider" />
            </View>
          </SafeAreaView>
        </ThemedView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  empty: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  preview: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    height: 120,
  },
  fullWidth: {
    width: '100%',
  },
  modal: {
    flex: 1,
  },
  modalSafeArea: {
    flex: 1,
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  modalTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  clear: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  canvas: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  canvasHint: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  modalButton: {
    flex: 1,
  },
});
