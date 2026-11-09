// Fallback for platforms without on-device health data (web).
// Metro picks index.android.ts / index.ios.ts on phones instead of this file.
import type { HealthPlatform } from './types';

export const health: HealthPlatform = {
  source: null,
  name: 'Health data',
  unavailableReason: async () => 'Health sync runs in the Android and iPhone apps.',
  requestAccess: async () => false,
  readDays: async () => [],
};
