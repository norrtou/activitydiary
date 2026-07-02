/**
 * Date and time helpers.
 *
 * Two currencies are used throughout the app:
 *  - DateKey: 'YYYY-MM-DD' in local time, identifying a calendar day.
 *  - minutes from midnight (0–1440) for positions within a day.
 */
import type { DateKey } from './types';

export const DAY_MIN = 1440;

/** Local-time date key for a Date (defaults to now). */
export function toDateKey(d: Date = new Date()): DateKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse a DateKey into a local-time Date at midnight. */
export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** First day of the week containing `key`. */
export function startOfWeek(key: DateKey, firstDayOfWeek: 0 | 1): DateKey {
  const d = fromDateKey(key);
  const shift = (d.getDay() - firstDayOfWeek + 7) % 7;
  d.setDate(d.getDate() - shift);
  return toDateKey(d);
}

/** The 7 date keys of the week starting at `weekStart`. */
export function weekDays(weekStart: DateKey): DateKey[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** ISO 8601 week number (matches Swedish calendar convention). */
export function isoWeekNumber(key: DateKey): number {
  const d = fromDateKey(key);
  // Shift to the Thursday of this week, then count weeks from Jan 1.
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7) + 3);
  const jan1 = new Date(t.getFullYear(), 0, 1);
  return 1 + Math.round((t.getTime() - jan1.getTime()) / (7 * 86400000));
}

/** Minutes from midnight for a Date (defaults to now). */
export function nowMinutes(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Snap minutes to the nearest multiple of `slot`, clamped to the day. */
export function snapMinutes(min: number, slot: number): number {
  return Math.min(DAY_MIN, Math.max(0, Math.round(min / slot) * slot));
}

/** 'HH:mm' for a minutes-from-midnight value (1440 renders as 24:00). */
export function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Parse 'HH:mm' into minutes from midnight; returns null when malformed. */
export function parseHHMM(text: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min > 0)) return null;
  return h * 60 + min;
}

/** Duration like '7 h 30 min' / '45 min', using translated unit labels. */
export function formatDuration(min: number, hourUnit: string, minUnit: string): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} ${minUnit}`;
  if (m === 0) return `${h} ${hourUnit}`;
  return `${h} ${hourUnit} ${m} ${minUnit}`;
}

/** Locale-aware weekday + date heading, e.g. 'måndag 1 juli' / 'Monday, July 1'. */
export function formatDayHeading(key: DateKey, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(fromDateKey(key));
}

/** Short date, e.g. '1 jul' / 'Jul 1'. */
export function formatShortDate(key: DateKey, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(
    fromDateKey(key),
  );
}

/** Two-letter weekday, e.g. 'må' / 'Mo'. */
export function formatWeekdayShort(key: DateKey, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(fromDateKey(key));
}

export interface TimeRange {
  startMin: number;
  endMin: number;
}

/** True when two in-day ranges overlap by at least one minute. */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

/**
 * Split a possibly midnight-crossing range into per-day pieces.
 * E.g. 23:00–01:30 on Monday becomes Mon 23:00–24:00 + Tue 00:00–01:30.
 * A range that ends at or before its start is treated as crossing midnight.
 */
export function splitOverMidnight(
  date: DateKey,
  startMin: number,
  endMin: number,
): Array<{ date: DateKey; startMin: number; endMin: number }> {
  if (endMin > startMin) return [{ date, startMin, endMin }];
  const pieces = [];
  if (startMin < DAY_MIN) pieces.push({ date, startMin, endMin: DAY_MIN });
  if (endMin > 0) pieces.push({ date: addDays(date, 1), startMin: 0, endMin });
  return pieces;
}
