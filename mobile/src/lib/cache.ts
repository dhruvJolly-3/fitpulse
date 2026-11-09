import AsyncStorage from '@react-native-async-storage/async-storage';

// Two-level cache for screen data (stale-while-revalidate):
//   memory  → instant on every revisit within a session (synchronous read)
//   storage → instant on a cold app start, even while the free-tier API is
//             still waking up
// Screens always render cached data first and replace it when fresh data
// arrives, so the user never stares at a loading screen for their own data.

const PREFIX = 'fp_cache:';
const memory = new Map<string, unknown>();

export const cache = {
  // Synchronous: only what this session has already loaded
  peek<T>(key: string): T | undefined {
    return memory.get(key) as T | undefined;
  },

  async read<T>(key: string): Promise<T | undefined> {
    if (memory.has(key)) return memory.get(key) as T;
    try {
      const raw = await AsyncStorage.getItem(PREFIX + key);
      if (raw == null) return undefined;
      const value = JSON.parse(raw) as T;
      memory.set(key, value);
      return value;
    } catch {
      return undefined; // a corrupt entry is just a cache miss
    }
  },

  write<T>(key: string, value: T) {
    memory.set(key, value);
    AsyncStorage.setItem(PREFIX + key, JSON.stringify(value)).catch(() => {});
  },

  // Update a cached value in place (memory + storage) if it exists, e.g. so a
  // drink logged on the Water screen is already counted on Home's saved copy
  async patch<T>(key: string, update: (value: T) => T) {
    const current = await this.read<T>(key);
    if (current !== undefined) this.write(key, update(current));
  },

  // Called on sign-out so the next account never sees this one's data
  async clear() {
    memory.clear();
    try {
      const keys = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(PREFIX));
      if (keys.length) await AsyncStorage.multiRemove(keys);
    } catch {
      /* nothing cached */
    }
  },
};
