import { Platform } from 'react-native';

/**
 * expo-haptics is a native module, so the APK Marc has installed today does not
 * contain it. Loading it lazily means an over-the-air update carrying this code
 * still runs on that APK (silently, without vibration), and haptics switch on
 * with the next build.
 */
type HapticsModule = typeof import('expo-haptics');

let haptics: HapticsModule | null | undefined;

function load() {
  if (haptics === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      haptics = require('expo-haptics') as HapticsModule;
    } catch {
      haptics = null;
    }
  }

  return haptics;
}

function run(action: (module: HapticsModule) => Promise<void>) {
  const module = load();
  if (!module) {
    return;
  }

  try {
    action(module).catch(() => undefined);
  } catch {
    // Missing native side: no vibration, nothing else to do.
  }
}

// On Android the generic calls are emulated with the vibrator motor, which
// buzzes. The platform haptic constants give the short, crisp clicks Android's
// own UI uses, so those are preferred there.

/** A box ticked, a choice picked. */
export function tickHaptic() {
  run((module) =>
    Platform.OS === 'android'
      ? module.performAndroidHapticsAsync(module.AndroidHaptics.Segment_Tick)
      : module.selectionAsync()
  );
}

/** A report saved. */
export function successHaptic() {
  run((module) =>
    Platform.OS === 'android'
      ? module.performAndroidHapticsAsync(module.AndroidHaptics.Confirm)
      : module.notificationAsync(module.NotificationFeedbackType.Success)
  );
}
