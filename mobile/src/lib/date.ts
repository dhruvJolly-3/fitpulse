// Dates are 'YYYY-MM-DD' strings in the phone's local time, same as the web app.

const pad = (n: number) => String(n).padStart(2, '0');

export const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => toDateStr(new Date());

export const addDays = (date: Date, n: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

// First date of a window of `days` ending today
export const rangeStart = (days: number) => toDateStr(addDays(new Date(), -(days - 1)));

// Parse 'YYYY-MM-DD' as local noon (avoids timezone day-shifts)
export const parseDate = (s: string) => new Date(`${s}T12:00:00`);

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const shortDay = (s: string) => DAYS[parseDate(s).getDay()];
export const dayMonth = (s: string) => { const d = parseDate(s); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const longDate = (s: string) => { const d = parseDate(s); return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`; };

export const timeAgo = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return `${Math.round(hrs / 24)} d ago`;
};

// Turn sparse logs into one row per day, oldest first (missing days = 0)
export const dailySeries = <T extends { date: string }>(logs: T[], days: number, pick: (log: T) => number | undefined) => {
  const byDate = new Map(logs.map(l => [l.date, l]));
  return Array.from({ length: days }, (_, i) => {
    const date = toDateStr(addDays(new Date(), -(days - 1 - i)));
    const found = byDate.get(date);
    return { date, label: days > 7 ? String(parseDate(date).getDate()) : shortDay(date), value: found ? pick(found) || 0 : 0 };
  });
};

export const loggedAverage = (rows: { value: number }[]) => {
  const logged = rows.filter(r => r.value > 0);
  return logged.length ? logged.reduce((s, r) => s + r.value, 0) / logged.length : 0;
};
