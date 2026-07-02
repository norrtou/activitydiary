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
 * The eight built-in categories, mapped to the eight validated palette slots
 * in fixed slot order (the order is the CVD-safety mechanism of the palette).
 */
export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { builtinKey: 'sleep', swatchId: 'blue', icon: '😴', sortOrder: 0 },
  { builtinKey: 'personal', swatchId: 'aqua', icon: '🛁', sortOrder: 1 },
  { builtinKey: 'work', swatchId: 'yellow', icon: '💼', sortOrder: 2 },
  { builtinKey: 'chores', swatchId: 'green', icon: '🧹', sortOrder: 3 },
  { builtinKey: 'social', swatchId: 'violet', icon: '💬', sortOrder: 4 },
  { builtinKey: 'physical', swatchId: 'red', icon: '🏃', sortOrder: 5 },
  { builtinKey: 'leisure', swatchId: 'magenta', icon: '🎨', sortOrder: 6 },
  { builtinKey: 'other', swatchId: 'orange', icon: '📌', sortOrder: 7 },
];

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
