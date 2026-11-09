import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Session token storage: the OS keychain/keystore on phones, localStorage on web
// (SecureStore has no web implementation).
const KEY = 'fp_token';

export const tokenStore = {
  async get(): Promise<string | null> {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(KEY) ?? null;
    return SecureStore.getItemAsync(KEY);
  },
  async set(token: string): Promise<void> {
    if (Platform.OS === 'web') return globalThis.localStorage?.setItem(KEY, token);
    return SecureStore.setItemAsync(KEY, token);
  },
  async clear(): Promise<void> {
    if (Platform.OS === 'web') return globalThis.localStorage?.removeItem(KEY);
    return SecureStore.deleteItemAsync(KEY);
  },
};
