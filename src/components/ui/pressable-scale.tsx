import { useState, type ReactNode } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { EaseOut, Motion } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode | ((state: { pressed: boolean }) => ReactNode);
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  /** How far it sinks under the finger. Subtle by design. */
  scaleTo?: number;
};

/**
 * Sinks slightly on press-in so the tap is acknowledged before it completes.
 * A CSS transition on transform keeps it on the UI thread and interruptible.
 */
export function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressableScaleProps) {
  const [pressed, setPressed] = useState(false);
  const reducedMotion = useReducedMotion();
  const scale = pressed && !disabled && !reducedMotion ? scaleTo : 1;

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      pressRetentionOffset={16}
      style={[
        typeof style === 'function' ? style({ pressed }) : style,
        {
          transform: [{ scale }],
          transitionProperty: 'transform',
          transitionDuration: Motion.press,
          transitionTimingFunction: EaseOut,
        },
      ]}
      {...rest}>
      {typeof children === 'function' ? children({ pressed }) : children}
    </AnimatedPressable>
  );
}
