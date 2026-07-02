/**
 * Sample data: fills the last seven days with a plausible everyday schedule
 * so a new user (or a curious therapist) can explore every view immediately.
 * Only added on explicit request from Settings — never automatically.
 */
import { db, DEFAULT_CATEGORIES } from './db';
import { addDays, toDateKey } from './time';
import type { BuiltinCategoryKey, Entry } from './types';

/** [startMin, endMin, category, energy?, mood?] — times in minutes from midnight. */
type Block = [number, number, BuiltinCategoryKey, number?, number?];

const WEEKDAY: Block[] = [
  [0, 6 * 60 + 30, 'sleep'],
  [6 * 60 + 30, 7 * 60 + 15, 'personal', 0, 3],
  [7 * 60 + 15, 7 * 60 + 45, 'meals', 1, 4],
  [7 * 60 + 45, 8 * 60, 'chores', -1, 3],
  [8 * 60, 12 * 60, 'work', -1, 3],
  // Lunch together with colleagues — meals and social overlap on purpose,
  // to show that parallel activities are supported.
  [12 * 60, 12 * 60 + 45, 'meals', 1, 4],
  [12 * 60, 12 * 60 + 45, 'social', 1, 4],
  [12 * 60 + 45, 16 * 60 + 30, 'work', -2, 3],
  [17 * 60, 18 * 60, 'physical', 2, 4],
  [18 * 60, 18 * 60 + 45, 'chores', 0, 3],
  [18 * 60 + 45, 19 * 60 + 15, 'meals', 1, 4],
  [19 * 60 + 15, 21 * 60 + 30, 'leisure', 1, 4],
  [21 * 60 + 30, 22 * 60 + 30, 'personal', 1, 4],
  [22 * 60 + 30, 24 * 60, 'sleep'],
];

const WEEKEND: Block[] = [
  [0, 8 * 60 + 30, 'sleep'],
  [8 * 60 + 30, 9 * 60 + 30, 'personal', 1, 4],
  [9 * 60 + 30, 10 * 60 + 15, 'meals', 1, 4],
  [10 * 60 + 15, 11 * 60, 'chores', 0, 3],
  [11 * 60, 14 * 60, 'social', 2, 5],
  [14 * 60, 15 * 60, 'other', 0, 3],
  [15 * 60, 16 * 60 + 30, 'physical', 1, 4],
  [16 * 60 + 30, 19 * 60, 'leisure', 1, 4],
  // Dinner in front of the TV — another parallel-activity example.
  [18 * 60, 19 * 60, 'meals', 1, 4],
  [19 * 60, 20 * 60, 'social', 1, 5],
  [20 * 60, 23 * 60, 'leisure', 0, 4],
  [23 * 60, 24 * 60, 'sleep'],
];

/** Insert one week of example entries ending today. */
export async function loadSampleWeek(): Promise<void> {
  const categories = await db.categories.toArray();
  const idByKey = new Map(
    categories.filter((c) => c.builtinKey).map((c) => [c.builtinKey!, c.id!]),
  );
  // If categories were customised away, fall back to seeding defaults.
  if (idByKey.size === 0) {
    await db.categories.bulkAdd(DEFAULT_CATEGORIES);
    return loadSampleWeek();
  }

  const today = toDateKey();
  const entries: Entry[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const date = addDays(today, -offset);
    const dow = new Date(date).getDay();
    const template = dow === 0 || dow === 6 ? WEEKEND : WEEKDAY;
    for (const [startMin, endMin, key, energy, mood] of template) {
      const categoryId = idByKey.get(key);
      if (categoryId == null) continue;
      // Small per-day jitter so the week does not look machine-made.
      const jitter = ((offset * 7 + startMin) % 3) * 15 - 15;
      const s = Math.max(0, Math.min(1440, startMin === 0 ? 0 : startMin + jitter));
      const e = Math.max(s + 15, Math.min(1440, endMin === 1440 ? 1440 : endMin + jitter));
      entries.push({
        date,
        startMin: s,
        endMin: e,
        categoryId,
        energy: energy as Entry['energy'],
        mood: mood as Entry['mood'],
      });
    }
  }
  await db.entries.bulkAdd(entries);
}
