/**
 * Export and import of diary data.
 *
 * - CSV for spreadsheets (semicolon-separated for Swedish locales, where
 *   Excel expects ';' because ',' is the decimal separator).
 * - JSON backup: a complete snapshot (entries + categories) that can be
 *   restored on any device — this is also how a client hands their diary
 *   to a therapist.
 */
import { db } from './db';
import { minutesToHHMM } from './time';
import { categoryName } from './categoryName';
import type { Translate } from '../i18n';
import type { Category, Entry } from './types';

/** Quote a CSV field when it contains the separator, quotes or newlines. */
function csvField(value: string, sep: string): string {
  if (value.includes(sep) || value.includes('"') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function entriesToCsv(
  entries: Entry[],
  categories: Map<number, Category>,
  t: Translate,
  locale: string,
): string {
  const sep = locale.startsWith('sv') ? ';' : ',';
  const header = [
    t('report.date'),
    t('entry.start'),
    t('entry.end'),
    `${t('common.minUnit')}`,
    t('entry.category'),
    t('entry.label', { optional: t('common.optional') }),
    t('entry.energy'),
    t('entry.mood'),
    t('entry.note', { optional: t('common.optional') }),
  ];
  const rows = entries.map((e) => {
    const cat = categories.get(e.categoryId);
    return [
      e.date,
      minutesToHHMM(e.startMin),
      minutesToHHMM(e.endMin),
      String(e.endMin - e.startMin),
      cat ? categoryName(cat, t) : '',
      e.label ?? '',
      e.energy != null ? String(e.energy) : '',
      e.mood != null ? String(e.mood) : '',
      e.note ?? '',
    ];
  });
  // ﻿ BOM makes Excel detect UTF-8 (important for å/ä/ö).
  return (
    '﻿' +
    [header, ...rows].map((row) => row.map((f) => csvField(f, sep)).join(sep)).join('\r\n')
  );
}

export interface BackupFile {
  app: 'activity-diary';
  version: 1;
  exportedAt: string;
  categories: Category[];
  entries: Entry[];
}

export async function createBackup(): Promise<BackupFile> {
  return {
    app: 'activity-diary',
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: await db.categories.toArray(),
    entries: await db.entries.toArray(),
  };
}

/** Basic shape validation before a restore touches the database. */
export function parseBackup(text: string): BackupFile | null {
  try {
    const data = JSON.parse(text) as Partial<BackupFile>;
    if (data.app !== 'activity-diary' || data.version !== 1) return null;
    if (!Array.isArray(data.categories) || !Array.isArray(data.entries)) return null;
    const entriesOk = data.entries.every(
      (e) =>
        typeof e.date === 'string' &&
        typeof e.startMin === 'number' &&
        typeof e.endMin === 'number' &&
        typeof e.categoryId === 'number',
    );
    const categoriesOk = data.categories.every(
      (c) => typeof c.swatchId === 'string' && typeof c.sortOrder === 'number',
    );
    return entriesOk && categoriesOk ? (data as BackupFile) : null;
  } catch {
    return null;
  }
}

/** Replace the whole database with the backup's contents (atomic). */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  await db.transaction('rw', db.entries, db.categories, async () => {
    await db.entries.clear();
    await db.categories.clear();
    await db.categories.bulkAdd(backup.categories);
    await db.entries.bulkAdd(backup.entries);
  });
}

/** Trigger a client-side file download. */
export function downloadFile(filename: string, mime: string, content: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
