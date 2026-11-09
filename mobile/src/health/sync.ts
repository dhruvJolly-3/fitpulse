import { api } from '../lib/api';
import { health } from './index';
import type { HealthDay } from './types';

export type SyncSummary = { steps: number; sleep: number; weight: number; workouts: number; skipped: number };

// Drop days that carry no data, so a fresh install doesn't post 0-step days
const hasData = (d: HealthDay) =>
  Boolean(d.steps || d.sleep?.durationHours || d.weightKg || d.workouts?.length);

// Read the last `days` days from the phone and send them to the API.
export async function syncHealth(days = 7): Promise<{ summary: SyncSummary; lastSyncAt: string } | null> {
  if (!health.source) return null;
  const all = await health.readDays(days);
  const payload = all.filter(hasData);
  if (!payload.length) return { summary: { steps: 0, sleep: 0, weight: 0, workouts: 0, skipped: 0 }, lastSyncAt: new Date().toISOString() };
  return api.post('/health-sync', { source: health.source, days: payload });
}
