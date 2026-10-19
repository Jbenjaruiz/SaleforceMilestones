import { ValidateBy } from 'class-validator';

/** Calendar days travel as `YYYY-MM-DD` strings, with no time of day and no time zone (F01 §5). */
const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isCalendarDay(value: unknown): value is string {
  if (typeof value !== 'string' || !CALENDAR_DAY.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  // Rejects impossible dates such as 2026-02-30, which Date would otherwise roll over.
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function diffInDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Today's calendar day in the given IANA time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export const IsCalendarDay = () =>
  ValidateBy({
    name: 'isCalendarDay',
    validator: {
      validate: isCalendarDay,
      defaultMessage: (args) => `${args?.property} must be a valid date (YYYY-MM-DD)`,
    },
  });
