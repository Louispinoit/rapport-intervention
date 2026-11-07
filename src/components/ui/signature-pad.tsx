import { useRef, useState } from 'react';
import { Modal, PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PenIcon } from '@/components/ui/icons';
import { PrimaryButton } from '@/components/ui/primary-button';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
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
        { backgroundColor: theme.backgroundElement, borderColor: theme.line },
      ]}>
      <View style={[styles.baseline, { borderTopColor: theme.lineStrong }]}>
        <ThemedText style={[styles.baselineMark, { color: theme.textTertiary }]}>×</ThemedText>
      </View>
      <Strokes color={theme.text} strokes={visible} />
      {visible.length === 0 ? (
        <ThemedText themeColor="textSecondary" style={styles.canvasHint}>
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
        <View
          style={[styles.preview, { backgroundColor: theme.background, borderColor: theme.line }]}>
          <Strokes color={theme.text} strokes={strokes} />
        </View>
      ) : (
        <View style={[styles.emptyBox, { borderColor: theme.lineStrong }]}>
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            Le client n&apos;a pas encore signé.
          </ThemedText>
        </View>
      )}

      <PrimaryButton
        icon={(color) => <PenIcon color={color} size={19} />}
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

            <View style={styles.canvasArea}>
              <SignatureCanvas
                onAddStroke={(stroke) => setDraft((current) => [...current, stroke])}
                strokes={draft}
              />
            </View>

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
    fontFamily: FontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  emptyBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  baseline: {
    position: 'absolute',
    pointerEvents: 'none',
    left: '8%',
    right: '8%',
    bottom: '24%',
    borderTopWidth: 1,
  },
  baselineMark: {
    position: 'absolute',
    left: -2,
    top: -30,
    fontFamily: FontFamily.body,
    fontSize: 22,
    lineHeight: 26,
  },
  preview: {
    width: '100%',
    aspectRatio: SIGNATURE_BOX.width / SIGNATURE_BOX.height,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
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
    fontFamily: FontFamily.display,
    fontSize: 26,
    lineHeight: 30,
    textTransform: 'uppercase',
  },
  clear: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  canvas: {
    // Same shape as the capture space, so a finger is followed one to one instead
    // of each axis being scaled independently.
    width: '100%',
    aspectRatio: SIGNATURE_BOX.width / SIGNATURE_BOX.height,
    borderWidth: 1,
    borderRadius: Radius.md,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  canvasArea: {
    flex: 1,
    justifyContent: 'center',
  },
  canvasHint: {
    position: 'absolute',
    pointerEvents: 'none',
    // Spanning the full width, not shrink-wrapped: ThemedText carries a
    // flexShrink that was clipping this to "Signer avec le".
    left: 0,
    right: 0,
    top: '30%',
    textAlign: 'center',
    fontFamily: FontFamily.body,
    fontSize: 15,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  modalButton: {
    flex: 1,
  },
});
