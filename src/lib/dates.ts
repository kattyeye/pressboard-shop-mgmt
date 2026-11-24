// Dates are plain "YYYY-MM-DD" strings (a shop's local calendar day).
// All math happens in UTC so a day never shifts with the server's time zone.
export type ISODate = string;

const toDate = (d: ISODate) => new Date(`${d}T00:00:00Z`);
const fromDate = (d: Date): ISODate => d.toISOString().slice(0, 10);

export function todayIn(timeZone: string): ISODate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDays(d: ISODate, n: number): ISODate {
  const x = toDate(d);
  x.setUTCDate(x.getUTCDate() + n);
  return fromDate(x);
}

export function isWeekday(d: ISODate): boolean {
  const w = toDate(d).getUTCDay();
  return w >= 1 && w <= 5;
}

/** First weekday on or after d. */
export function onOrAfterWeekday(d: ISODate): ISODate {
  let r = d;
  while (!isWeekday(r)) r = addDays(r, 1);
  return r;
}

export function addWorkingDays(d: ISODate, n: number): ISODate {
  let r = d;
  let i = 0;
  const step = n < 0 ? -1 : 1;
  while (i < Math.abs(n)) {
    r = addDays(r, step);
    if (isWeekday(r)) i++;
  }
  return r;
}

/** Working days after `from`, up to and including `to`. */
export function workingDaysBetween(from: ISODate, to: ISODate): number {
  if (to <= from) return 0;
  let n = 0;
  let r = from;
  while (r < to) {
    r = addDays(r, 1);
    if (isWeekday(r)) n++;
  }
  return n;
}

/** `count` working days starting at `from` (inclusive when it's a weekday). */
export function workingDaysFrom(from: ISODate, count: number): ISODate[] {
  const out: ISODate[] = [];
  let r = onOrAfterWeekday(from);
  while (out.length < count) {
    if (isWeekday(r)) out.push(r);
    r = addDays(r, 1);
  }
  return out;
}

/** Monday of the week containing d. */
export function weekStart(d: ISODate): ISODate {
  const w = toDate(d).getUTCDay(); // 0 = Sunday
  return addDays(d, w === 0 ? -6 : 1 - w);
}

const fmt = (d: ISODate, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(toDate(d));

/** "Mon, Nov 16" */
export const shortDay = (d: ISODate) => fmt(d, { weekday: "short", month: "short", day: "numeric" });
/** "Monday, November 16" */
export const longDay = (d: ISODate) => fmt(d, { weekday: "long", month: "long", day: "numeric" });
/** "Mon" */
export const dow = (d: ISODate) => fmt(d, { weekday: "short" });
/** "16" */
export const dayNum = (d: ISODate) => String(toDate(d).getUTCDate());
/** "November 2026" */
export const monthTitle = (d: ISODate) => fmt(d, { month: "long", year: "numeric" });

/** "Tue, Nov 24 at 3:04 AM" in the shop's time zone */
export function timeIn(iso: string, timeZone: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(d);
  return `${day} at ${time}`;
}

export function monthBounds(month: string): { first: ISODate; last: ISODate } {
  const first = `${month}-01`;
  const d = toDate(first);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return { first, last: fromDate(d) };
}

export function shiftMonth(month: string, n: number): string {
  const d = toDate(`${month}-01`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return fromDate(d).slice(0, 7);
}
