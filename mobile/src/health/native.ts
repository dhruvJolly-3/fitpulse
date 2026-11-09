import Constants, { ExecutionEnvironment } from 'expo-constants';
import { TurboModuleRegistry } from 'react-native';

// Whether a native module is compiled into this app, checked WITHOUT loading
// the JS library that wraps it. Those libraries look their module up with
// getEnforcing() at import time; in development Metro reports that failure as
// a fatal red screen before any try/catch around require() can handle it.
// So: probe first with TurboModuleRegistry.get() (returns null, never throws),
// and only require the library when its native side is really there.
export const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const hasNativeModule = (name: string): boolean => {
  if (inExpoGo) return false; // Expo Go only ships Expo's own native modules
  try {
    return TurboModuleRegistry.get(name) != null;
  } catch {
    return false;
  }
};
