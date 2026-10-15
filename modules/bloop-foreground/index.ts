import { PermissionsAndroid, Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

interface BloopForegroundNative {
  start(title: string, artist: string): void;
  update(title: string, artist: string): void;
  stop(): void;
}

const isAndroid = Platform.OS === 'android';

let native: BloopForegroundNative | null = null;
if (isAndroid) {
  try {
    native = requireNativeModule<BloopForegroundNative>('BloopForeground');
  } catch {
    native = null;
  }
}

/**
 * Keeps the app process alive while music plays so the hidden YouTube WebView
 * can keep playing in the background. No-op on platforms without the module.
 */
export const backgroundPlayback = {
  supported: isAndroid && native != null,

  start(title: string, artist: string) {
    try {
      native?.start(title, artist);
    } catch {
      // ignore
    }
  },

  update(title: string, artist: string) {
    try {
      native?.update(title, artist);
    } catch {
      // ignore
    }
  },

  stop() {
    try {
      native?.stop();
    } catch {
      // ignore
    }
  },
};

/**
 * Foreground-service notifications need POST_NOTIFICATIONS on Android 13+.
 * The service still runs without it, but the user won't see the notification.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isAndroid || Number(Platform.Version) < 33) return true;
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}
