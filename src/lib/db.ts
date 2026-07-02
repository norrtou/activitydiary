/**
 * Local database (IndexedDB via Dexie).
 *
 * All diary data stays on the device; nothing is ever sent to a server.
 * Components read reactively with useLiveQuery from dexie-react-hooks.
 */
import Dexie, { type EntityTable } from 'dexie';
import type { Category, Entry } from './types';

export const db = new Dexie('activity-diary') as Dexie & {
  entries: EntityTable<Entry, 'id'>;
  categories: EntityTable<Category, 'id'>;
};

db.version(1).stores({
  // Indexes only — non-indexed fields are still stored.
  entries: '++id, date, categoryId',
  categories: '++id, sortOrder',
});

/**
 * The nine built-in categories on the eight validated palette slots.
 * "meals" reuses the orange slot ("other" is rare and far away in the order);
 * this ordering was re-run through the dataviz palette validator — worst
 * adjacent CVD ΔE 21.6 in light mode, dark stays in the same band as before.
 */
export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { builtinKey: 'sleep', swatchId: 'blue', icon: '😴', sortOrder: 0 },
  { builtinKey: 'personal', swatchId: 'aqua', icon: '🛁', sortOrder: 1 },
  { builtinKey: 'meals', swatchId: 'orange', icon: '🍽️', sortOrder: 2 },
  { builtinKey: 'work', swatchId: 'yellow', icon: '💼', sortOrder: 3 },
  { builtinKey: 'chores', swatchId: 'green', icon: '🧹', sortOrder: 4 },
  { builtinKey: 'social', swatchId: 'violet', icon: '💬', sortOrder: 5 },
  { builtinKey: 'physical', swatchId: 'red', icon: '🏃', sortOrder: 6 },
  { builtinKey: 'leisure', swatchId: 'magenta', icon: '🎨', sortOrder: 7 },
  { builtinKey: 'other', swatchId: 'orange', icon: '📌', sortOrder: 8 },
];

// v2 adds the built-in "meals" category for databases created before it
// existed. Fresh databases skip upgrades and get it via populate below.
db.version(2)
  .stores({
    entries: '++id, date, categoryId',
    categories: '++id, sortOrder',
  })
  .upgrade(async (tx) => {
    const categories = tx.table<Category, number>('categories');
    const all = await categories.toArray();
    if (all.some((c) => c.builtinKey === 'meals')) return;
    const meals = DEFAULT_CATEGORIES.find((c) => c.builtinKey === 'meals')!;
    await Promise.all(
      all
        .filter((c) => c.sortOrder >= meals.sortOrder)
        .map((c) => categories.update(c.id!, { sortOrder: c.sortOrder + 1 })),
    );
    await categories.add(meals as Category);
  });

db.on('populate', (tx) => {
  void tx.table('categories').bulkAdd(DEFAULT_CATEGORIES);
});

/** Entries for one day, sorted by start time. */
export async function entriesForDate(date: string): Promise<Entry[]> {
  const rows = await db.entries.where('date').equals(date).toArray();
  return rows.sort((a, b) => a.startMin - b.startMin);
}

/** Entries for an inclusive date-key range, sorted by date then start time. */
export async function entriesForRange(from: string, to: string): Promise<Entry[]> {
  const rows = await db.entries.where('date').between(from, to, true, true).toArray();
  return rows.sort((a, b) => (a.date === b.date ? a.startMin - b.startMin : a.date < b.date ? -1 : 1));
}

/** Active (non-archived) categories in display order. */
export async function activeCategories(): Promise<Category[]> {
  const rows = await db.categories.toArray();
  return rows.filter((c) => !c.archived).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** All categories (including archived), in display order. */
export async function allCategories(): Promise<Category[]> {
  const rows = await db.categories.toArray();
  return rows.sort((a, b) => a.sortOrder - b.sortOrder);
}
