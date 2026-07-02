import { describe, expect, it } from 'vitest';
import { entriesToCsv, parseBackup, type BackupFile } from './export';
import { en, type MessageKey } from '../i18n/en';
import type { Category, Entry } from './types';

const t = (key: MessageKey, vars?: Record<string, string | number>) => {
  let text: string = en[key];
  for (const [name, value] of Object.entries(vars ?? {})) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
};

const categories = new Map<number, Category>([
  [1, { id: 1, builtinKey: 'work', swatchId: 'yellow', icon: '💼', sortOrder: 2 }],
]);

const entry: Entry = {
  id: 1,
  date: '2026-07-01',
  startMin: 480,
  endMin: 750,
  categoryId: 1,
  label: 'Team meeting; "quarterly"',
  energy: -1,
  mood: 3,
  note: 'Line one\nline two',
};

describe('entriesToCsv', () => {
  it('uses semicolons for Swedish and commas otherwise', () => {
    expect(entriesToCsv([entry], categories, t, 'sv-SE')).toContain(';');
    const enCsv = entriesToCsv([entry], categories, t, 'en-GB');
    expect(enCsv.split('\r\n')[0]).toContain(',');
  });

  it('quotes fields containing separators, quotes and newlines', () => {
    const csv = entriesToCsv([entry], categories, t, 'en-GB');
    expect(csv).toContain('"Team meeting; ""quarterly"""');
    expect(csv).toContain('"Line one\nline two"');
  });

  it('writes times and duration', () => {
    const csv = entriesToCsv([entry], categories, t, 'en-GB');
    expect(csv).toContain('08:00');
    expect(csv).toContain('12:30');
    expect(csv).toContain('270');
  });
});

describe('parseBackup', () => {
  const valid: BackupFile = {
    app: 'activity-diary',
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: [...categories.values()],
    entries: [entry],
  };

  it('round-trips a valid backup', () => {
    const parsed = parseBackup(JSON.stringify(valid));
    expect(parsed).not.toBeNull();
    expect(parsed!.entries).toHaveLength(1);
    expect(parsed!.categories[0].swatchId).toBe('yellow');
  });

  it('rejects foreign or malformed files', () => {
    expect(parseBackup('{}')).toBeNull();
    expect(parseBackup('not json')).toBeNull();
    expect(parseBackup(JSON.stringify({ ...valid, app: 'other' }))).toBeNull();
    expect(
      parseBackup(JSON.stringify({ ...valid, entries: [{ date: 42 }] })),
    ).toBeNull();
  });
});
