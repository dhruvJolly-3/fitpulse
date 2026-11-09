// Android: Health Connect (the replacement for the Google Fit APIs).
// Needs a development/production build; Expo Go does not include this native module.
import {
  aggregateRecord, getGrantedPermissions, getSdkStatus, initialize, readRecords, requestPermission,
  SdkAvailabilityStatus, ExerciseType, type Permission,
} from 'react-native-health-connect';
import { dayWindows, round, wakeDate, type HealthDay, type HealthPlatform } from './types';

const PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'Weight' },
];

// ExerciseType number → readable name ("RUNNING" → "running")
const EXERCISE_NAMES = Object.fromEntries(Object.entries(ExerciseType).map(([k, v]) => [v, k.toLowerCase().replace(/_/g, ' ')]));

let initialized = false;
const ensureInit = async () => {
  if (!initialized) initialized = await initialize();
  return initialized;
};

const granted = async (recordType: Permission['recordType']) =>
  (await getGrantedPermissions()).some(p => p.recordType === recordType && p.accessType === 'read');

export const health: HealthPlatform = {
  source: 'health_connect',
  name: 'Health Connect',

  async unavailableReason() {
    try {
      const status = await getSdkStatus();
      if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE) return 'Health Connect is not available on this phone.';
      if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'Install or update Health Connect from the Play Store, then try again.';
      return null;
    } catch {
      return 'Health sync needs the installed FitPulse app (not Expo Go).';
    }
  },

  async requestAccess() {
    if (!(await ensureInit())) return false;
    const result = await requestPermission(PERMISSIONS);
    return result.length > 0;
  },

  async readDays(days) {
    if (!(await ensureInit())) return [];
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
          type: r.title || EXERCISE_NAMES[r.exerciseType] || 'workout',
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
