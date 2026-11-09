// One day of on-device health data, in the shape POST /api/health-sync expects.
export interface HealthDay {
  date: string; // YYYY-MM-DD, phone local time
  steps?: number;
  distanceKm?: number;
  activeCalories?: number;
  weightKg?: number;
  sleep?: { durationHours: number; bedtime?: string; wakeTime?: string };
  workouts?: { id: string; type: string; start: string; end: string; calories?: number; distanceKm?: number }[];
}

export type HealthSource = 'health_connect' | 'apple_health';

export interface HealthPlatform {
  source: HealthSource | null;
  name: string;
  // Why sync is unavailable, or null if it can be used
  unavailableReason: () => Promise<string | null>;
  requestAccess: () => Promise<boolean>;
  readDays: (days: number) => Promise<HealthDay[]>;
}

// Local day windows [start, end) for the last `days` days, oldest first
export const dayWindows = (days: number) => {
  const out: { date: string; start: Date; end: Date }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    out.push({ date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`, start, end: end > now ? now : end });
  }
  return out;
};

// Which local date a sleep session belongs to: the morning you woke up
export const wakeDate = (end: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
};

export const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;
