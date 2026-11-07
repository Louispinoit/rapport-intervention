import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

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
/** Transparency lives on the whole puff; the cloud itself is drawn solid. */
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
          <Svg height={PUFF.height} viewBox={`0 0 ${PUFF.width} ${PUFF.height}`} width={PUFF.width}>
            <Path d={CLOUD} fill={color} />
          </Svg>
        </Animated.View>
      ))}
    </View>
  );
}

const PUFF = { width: 34, height: 24 };

function circle(cx: number, cy: number, r: number) {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
}

/**
 * Three overlapping circles in a single path, filled as one shape. Android
 * applies a parent's opacity to each child separately, so separate circles
 * showed brighter lens shapes where they overlapped; one path has no overlap.
 */
const CLOUD = [circle(9, 15.5, 8.5), circle(18.5, 9.5, 9.5), circle(26, 15.5, 7.5)].join('');

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
});
