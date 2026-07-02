/**
 * Aggregation helpers that turn raw entries into the numbers behind the
 * Insights view and the PDF report. Pure functions — easy to unit test.
 */
import type { Category, Entry } from './types';

export interface CategoryTotal {
  categoryId: number;
  minutes: number;
  /** Fraction of all registered time, 0–1. */
  share: number;
  /** Average minutes per registered day (days that have at least one entry). */
  avgPerDayMin: number;
}

/**
 * Total registered minutes per category over the period. Averages divide by
 * the number of days that actually have entries — a half-filled week should
 * read "how much on a typical day", not be diluted by empty days.
 */
export function categoryTotals(entries: Entry[]): CategoryTotal[] {
  const byCat = new Map<number, number>();
  let total = 0;
  for (const e of entries) {
    const d = e.endMin - e.startMin;
    byCat.set(e.categoryId, (byCat.get(e.categoryId) ?? 0) + d);
    total += d;
  }
  const days = activeDayCount(entries);
  return [...byCat.entries()].map(([categoryId, minutes]) => ({
    categoryId,
    minutes,
    share: total > 0 ? minutes / total : 0,
    avgPerDayMin: days > 0 ? minutes / days : 0,
  }));
}

/** minutes per category for each day: date -> (categoryId -> minutes). */
export function perDayCategoryMinutes(
  entries: Entry[],
  days: string[],
): Map<string, Map<number, number>> {
  const result = new Map<string, Map<number, number>>(days.map((d) => [d, new Map()]));
  for (const e of entries) {
    const day = result.get(e.date);
    if (!day) continue;
    day.set(e.categoryId, (day.get(e.categoryId) ?? 0) + (e.endMin - e.startMin));
  }
  return result;
}

/**
 * Duration-weighted daily average of an optional rating (energy or mood).
 * Days without any rated entries are absent from the map.
 */
export function dailyRatingAverage(
  entries: Entry[],
  field: 'energy' | 'mood',
): Map<string, number> {
  const sums = new Map<string, { weighted: number; weight: number }>();
  for (const e of entries) {
    const value = e[field];
    if (value == null) continue;
    const w = e.endMin - e.startMin;
    const acc = sums.get(e.date) ?? { weighted: 0, weight: 0 };
    acc.weighted += value * w;
    acc.weight += w;
    sums.set(e.date, acc);
  }
  return new Map(
    [...sums.entries()].map(([date, { weighted, weight }]) => [date, weighted / weight]),
  );
}

/**
 * Fraction of each hour of the day spent per category, averaged over the
 * days of the period that have any entries. Used by the activity clock.
 * Returns hour (0–23) -> (categoryId -> fraction of that hour, 0–1).
 */
export function hourlyCategoryFractions(
  entries: Entry[],
  activeDayCount: number,
): Map<number, Map<number, number>> {
  const result = new Map<number, Map<number, number>>();
  if (activeDayCount === 0) return result;
  for (const e of entries) {
    const firstHour = Math.floor(e.startMin / 60);
    const lastHour = Math.ceil(e.endMin / 60);
    for (let h = firstHour; h < lastHour; h++) {
      const overlap = Math.min(e.endMin, (h + 1) * 60) - Math.max(e.startMin, h * 60);
      if (overlap <= 0) continue;
      const hour = result.get(h) ?? new Map<number, number>();
      hour.set(e.categoryId, (hour.get(e.categoryId) ?? 0) + overlap / 60 / activeDayCount);
      result.set(h, hour);
    }
  }
  return result;
}

/** Number of distinct days that have at least one entry. */
export function activeDayCount(entries: Entry[]): number {
  return new Set(entries.map((e) => e.date)).size;
}

/** Total minutes in the sleep category per active day, or null when unknown. */
export function sleepAveragePerActiveDay(
  entries: Entry[],
  categories: Category[],
): number | null {
  const sleepCat = categories.find((c) => c.builtinKey === 'sleep');
  if (!sleepCat) return null;
  const days = activeDayCount(entries);
  if (days === 0) return null;
  const total = entries
    .filter((e) => e.categoryId === sleepCat.id)
    .reduce((sum, e) => sum + (e.endMin - e.startMin), 0);
  return total / days;
}
