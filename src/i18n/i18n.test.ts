import { describe, expect, it } from 'vitest';
import { en } from './en';
import { sv } from './sv';

/** {placeholder} names used in a message. */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

describe('i18n dictionaries', () => {
  it('Swedish covers exactly the same keys as English', () => {
    expect(Object.keys(sv).sort()).toEqual(Object.keys(en).sort());
  });

  it('no message is empty in either language', () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value.trim(), `en:${key}`).not.toBe('');
    }
    for (const [key, value] of Object.entries(sv)) {
      expect(value.trim(), `sv:${key}`).not.toBe('');
    }
  });

  it('interpolation placeholders match between languages', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(sv[key]), key).toEqual(placeholders(en[key]));
    }
  });

  it('quick-pick lists are parallel, non-empty and unique in both languages', () => {
    const quickKeys = (Object.keys(en) as (keyof typeof en)[]).filter((k) =>
      k.startsWith('quick.'),
    );
    expect(quickKeys.length).toBeGreaterThan(0);
    for (const key of quickKeys) {
      const enList = en[key].split('|');
      const svList = sv[key].split('|');
      expect(svList.length, key).toBe(enList.length);
      for (const list of [enList, svList]) {
        expect(list.every((item) => item.trim() === item && item.length > 0), key).toBe(true);
        expect(new Set(list).size, key).toBe(list.length);
      }
    }
  });
});
