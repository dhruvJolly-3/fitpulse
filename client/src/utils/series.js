import { format, subDays } from 'date-fns';

// Helpers for the 7-day / 30-day history charts.

// First date (YYYY-MM-DD) of a window of `days` ending today.
export const rangeStart = (days) => format(subDays(new Date(), days - 1), 'yyyy-MM-dd');

// Turn sparse server logs into one row per day (missing days = 0), oldest first.
//   logs       array of docs with a `date` field ('YYYY-MM-DD')
//   days       7 or 30
//   key        name of the value field in each output row
//   pick(log)  reads the value from a log
// Each row: { date: 'YYYY-MM-DD', day: 'Mon' (7d) or '26' (30d), [key]: value }
export const dailySeries = (logs, days, key, pick) => {
  const byDate = new Map((logs || []).map(l => [l.date, l]));
  return Array.from({ length: days }, (_, i) => {
    const d = subDays(new Date(), days - 1 - i);
    const date = format(d, 'yyyy-MM-dd');
    const found = byDate.get(date);
    return { date, day: format(d, days > 7 ? 'd' : 'EEE'), [key]: found ? pick(found) || 0 : 0 };
  });
};

// Average of the non-zero days only, so un-logged days don't drag it down.
export const loggedAverage = (rows, key) => {
  const logged = rows.filter(r => r[key] > 0);
  return logged.length ? logged.reduce((s, r) => s + r[key], 0) / logged.length : 0;
};
