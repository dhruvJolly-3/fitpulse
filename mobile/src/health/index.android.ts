// Android: Health Connect (the replacement for the Google Fit APIs).
// Needs a development/production build; Expo Go does not include this native module,
// so the library is required lazily and the rest of the app still runs in Expo Go.
import type * as HealthConnectModule from 'react-native-health-connect';
import { hasNativeModule } from './native';
import { dayWindows, round, wakeDate, type HealthDay, type HealthPlatform } from './types';

type Permission = HealthConnectModule.Permission;

const PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'Weight' },
];

let cached: typeof HealthConnectModule | null | undefined;
const load = (): typeof HealthConnectModule | null => {
  if (cached === undefined) {
    // The library calls getEnforcing('HealthConnect') on import, which is fatal without it
    if (!hasNativeModule('HealthConnect')) return (cached = null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cached = require('react-native-health-connect') as typeof HealthConnectModule;
    } catch {
      cached = null;
    }
  }
  return cached;
};
const NOT_IN_EXPO_GO = 'Health sync needs the installed FitPulse app (not Expo Go).';
const hc = () => {
  const mod = load();
  if (!mod) throw new Error(NOT_IN_EXPO_GO);
  return mod;
};

// ExerciseType number → readable name ("RUNNING" → "running")
const exerciseName = (type: number) => {
  const entry = Object.entries(hc().ExerciseType).find(([, v]) => v === type);
  return entry ? entry[0].toLowerCase().replace(/_/g, ' ') : 'workout';
};

let initialized = false;
const ensureInit = async () => {
  if (!initialized) initialized = await hc().initialize();
  return initialized;
};

const granted = async (recordType: Permission['recordType']) =>
  (await hc().getGrantedPermissions()).some(p => p.recordType === recordType && p.accessType === 'read');

export const health: HealthPlatform = {
  source: 'health_connect',
  name: 'Health Connect',

  async unavailableReason() {
    try {
      const { getSdkStatus, SdkAvailabilityStatus } = hc();
      const status = await getSdkStatus();
      if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE) return 'Health Connect is not available on this phone.';
      if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'Install or update Health Connect from the Play Store, then try again.';
      return null;
    } catch {
      return NOT_IN_EXPO_GO;
    }
  },

  async requestAccess() {
    if (!(await ensureInit())) return false;
    const result = await hc().requestPermission(PERMISSIONS);
    return result.length > 0;
  },

  async readDays(days) {
    if (!(await ensureInit())) return [];
    const { aggregateRecord, readRecords } = hc();
    const windows = dayWindows(days);
    const range = { operator: 'between' as const, startTime: windows[0].start.toISOString(), endTime: new Date().toISOString() };
    const byDate = new Map<string, HealthDay>(windows.map(w => [w.date, { date: w.date }]));
    const [canSteps, canDistance, canCalories, canSleep, canExercise, canWeight] = await Promise.all(
      PERMISSIONS.map(p => granted(p.recordType)),
    );

    for (const w of windows) {
      const day = byDate.get(w.date)!;
      const filter = { operator: 'between' as const, startTime: w.start.toISOString(), endTime: w.end.toISOString() };
      // Aggregates de-duplicate overlapping sources (phone + watch) for us
      if (canSteps) day.steps = (await aggregateRecord({ recordType: 'Steps', timeRangeFilter: filter })).COUNT_TOTAL ?? 0;
      if (canDistance) day.distanceKm = round((await aggregateRecord({ recordType: 'Distance', timeRangeFilter: filter })).DISTANCE?.inKilometers ?? 0, 2);
      if (canCalories) day.activeCalories = Math.round((await aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter: filter })).ACTIVE_CALORIES_TOTAL?.inKilocalories ?? 0);
    }

    if (canSleep) {
      const { records } = await readRecords('SleepSession', { timeRangeFilter: range });
      for (const r of records) {
        const end = new Date(r.endTime);
        const day = byDate.get(wakeDate(end));
        if (!day) continue;
        const hours = (end.getTime() - new Date(r.startTime).getTime()) / 3.6e6;
        // Several sessions on one morning (naps, split nights) add up
        day.sleep = {
          durationHours: round((day.sleep?.durationHours || 0) + hours, 2),
          bedtime: day.sleep?.bedtime || r.startTime,
          wakeTime: r.endTime,
        };
      }
    }

    if (canExercise) {
      const { records } = await readRecords('ExerciseSession', { timeRangeFilter: range });
      for (const r of records) {
        const day = byDate.get(wakeDate(new Date(r.startTime)));
        if (!day) continue;
        (day.workouts ||= []).push({
          id: r.metadata?.id || `${r.exerciseType}-${r.startTime}`,
          type: r.title || exerciseName(r.exerciseType),
          start: r.startTime,
          end: r.endTime,
        });
      }
    }

    if (canWeight) {
      const { records } = await readRecords('Weight', { timeRangeFilter: range });
      for (const r of records) {
        const day = byDate.get(wakeDate(new Date(r.time)));
        if (day) day.weightKg = round(r.weight.inKilograms, 1); // last reading of the day wins
      }
    }

    return [...byDate.values()];
  },
};
