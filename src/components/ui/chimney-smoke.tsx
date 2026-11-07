import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

type ChimneySmokeProps = {
  /** Size the ChimneyMark is drawn at, so the puffs line up with its chimney. */
  markSize: number;
  /** An opaque colour; the animation sets the transparency. */
  color: string;
  /** Pauses the loop while the screen is out of view. */
  running: boolean;
};

const PUFF_COUNT = 3;
const CYCLE = 4200;
/**
 * Transparency lives on the whole puff, and its circles are drawn solid, so
 * where they overlap they merge into one cloud instead of stacking brighter.
 */
const PEAK_OPACITY = 0.22;

/**
 * Smoke puffs rising from the chimney: each one rises, drifts with
 * the wind, swells and thins out. A CSS animation, so it runs on the UI thread
 * and keeps going smoothly while JavaScript is busy.
 */
const drift = {
  '0%': {
    opacity: 0,
    transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 0.55 }],
  },
  '18%': {
    opacity: PEAK_OPACITY,
    transform: [{ translateX: -4 }, { translateY: -12 }, { scale: 0.85 }],
  },
  '100%': {
    opacity: 0,
    transform: [{ translateX: -34 }, { translateY: -70 }, { scale: 1.7 }],
  },
};

export function ChimneySmoke({ markSize, color, running }: ChimneySmokeProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return null;
  }

  // The chimney's cap is centred on x=717 with its top at y=302 in the mark's
  // 1024 grid; puffs start just inside it so they seem to come out of the flue.
  const k = markSize / 1024;
  const left = 717 * k - PUFF.width / 2;
  const top = 302 * k - PUFF.height * 0.75;

  return (
    <View style={[styles.origin, { left, top }]}>
      {Array.from({ length: PUFF_COUNT }, (_, index) => (
        <Animated.View
          key={index}
          style={[
            styles.puff,
            {
              animationName: drift,
              animationDuration: CYCLE,
              animationDelay: (CYCLE / PUFF_COUNT) * index,
              animationIterationCount: 'infinite',
              animationTimingFunction: 'ease-out',
              animationFillMode: 'both',
              animationPlayState: running ? 'running' : 'paused',
            },
          ]}>
          {/* Three overlapping circles read as a small cloud rather than a dot. */}
          <View style={[styles.blob, styles.blobA, { backgroundColor: color }]} />
          <View style={[styles.blob, styles.blobB, { backgroundColor: color }]} />
          <View style={[styles.blob, styles.blobC, { backgroundColor: color }]} />
        </Animated.View>
      ))}
    </View>
  );
}

const PUFF = { width: 34, height: 24 };

const styles = StyleSheet.create({
  origin: {
    position: 'absolute',
    pointerEvents: 'none',
    width: PUFF.width,
    height: PUFF.height,
  },
  puff: {
    position: 'absolute',
    width: PUFF.width,
    height: PUFF.height,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobA: { left: 0, top: 7, width: 18, height: 17 },
  blobB: { left: 9, top: 0, width: 19, height: 19 },
  blobC: { left: 18, top: 8, width: 16, height: 15 },
});
