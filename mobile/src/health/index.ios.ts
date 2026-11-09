// iPhone: Apple Health (HealthKit).
// Needs a development/production build; Expo Go does not include this native module.
import {
  isHealthDataAvailableAsync, queryCategorySamples, queryQuantitySamples, queryStatisticsForQuantity,
  queryWorkoutSamples, requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import { dayWindows, round, wakeDate, type HealthDay, type HealthPlatform } from './types';

const READ = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierBodyMass',
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKWorkoutTypeIdentifier',
] as const;

// HKCategoryValueSleepAnalysis: 0 inBed, 1 asleepUnspecified, 2 awake, 3 core, 4 deep, 5 REM
const ASLEEP = new Set([1, 3, 4, 5]);

export const health: HealthPlatform = {
  source: 'apple_health',
  name: 'Apple Health',

  async unavailableReason() {
    try {
      return (await isHealthDataAvailableAsync()) ? null : 'Apple Health is not available on this device.';
    } catch {
      return 'Health sync needs the installed FitPulse app (not Expo Go).';
    }
  },

  async requestAccess() {
    // iOS never reveals whether read access was granted; it just returns no data if not
    return requestAuthorization({ toRead: READ });
  },

  async readDays(days) {
    const windows = dayWindows(days);
    const from = windows[0].start;
    const to = new Date();
    const byDate = new Map<string, HealthDay>(windows.map(w => [w.date, { date: w.date }]));

    for (const w of windows) {
      const day = byDate.get(w.date)!;
      const filter = { date: { startDate: w.start, endDate: w.end } };
      // Statistics queries merge iPhone + Apple Watch without double counting
      const [steps, distance, energy] = await Promise.all([
        queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], { filter, unit: 'count' }),
        queryStatisticsForQuantity('HKQuantityTypeIdentifierDistanceWalkingRunning', ['cumulativeSum'], { filter, unit: 'km' }),
        queryStatisticsForQuantity('HKQuantityTypeIdentifierActiveEnergyBurned', ['cumulativeSum'], { filter, unit: 'kcal' }),
      ]);
      day.steps = Math.round(steps.sumQuantity?.quantity ?? 0);
      day.distanceKm = round(distance.sumQuantity?.quantity ?? 0, 2);
      day.activeCalories = Math.round(energy.sumQuantity?.quantity ?? 0);
    }

    const range = { date: { startDate: from, endDate: to } };
    const sleep = await queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', { filter: range, limit: 0 });
    for (const sample of sleep) {
      if (!ASLEEP.has(Number(sample.value))) continue;
      const day = byDate.get(wakeDate(sample.endDate));
      if (!day) continue;
      const hours = (sample.endDate.getTime() - sample.startDate.getTime()) / 3.6e6;
      day.sleep = {
        durationHours: round((day.sleep?.durationHours || 0) + hours, 2),
        bedtime: day.sleep?.bedtime && day.sleep.bedtime < sample.startDate.toISOString() ? day.sleep.bedtime : sample.startDate.toISOString(),
        wakeTime: !day.sleep?.wakeTime || day.sleep.wakeTime < sample.endDate.toISOString() ? sample.endDate.toISOString() : day.sleep.wakeTime,
      };
    }

    const workouts = await queryWorkoutSamples({ filter: range, limit: 0 });
    for (const wk of workouts) {
      const day = byDate.get(wakeDate(wk.startDate));
      if (!day) continue;
      (day.workouts ||= []).push({
        id: wk.uuid,
        type: String(wk.workoutActivityType ?? 'workout'),
        start: wk.startDate.toISOString(),
        end: wk.endDate.toISOString(),
        calories: wk.totalEnergyBurned ? Math.round(wk.totalEnergyBurned.quantity) : undefined,
        distanceKm: wk.totalDistance ? round(wk.totalDistance.quantity / 1000, 2) : undefined,
      });
    }

    const weights = await queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', { filter: range, limit: 0, unit: 'kg', ascending: true });
    for (const w of weights) {
      const day = byDate.get(wakeDate(w.startDate));
      if (day) day.weightKg = round(w.quantity, 1);
    }

    return [...byDate.values()];
  },
};
