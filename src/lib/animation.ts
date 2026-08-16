import { Platform } from 'react-native';

/**
 * Whether Animated should drive an animation natively.
 *
 * react-native-web ships no `RCTAnimation` module, so asking for the native
 * driver there earns a console warning and then falls back to the JS driver
 * regardless — the flag buys nothing on web but noise. Native keeps it, which is
 * where it actually moves work off the JS thread.
 *
 * Pass this instead of a literal `true` to every `Animated.timing/event/...`.
 */
export const USE_NATIVE_DRIVER = Platform.OS !== 'web';
