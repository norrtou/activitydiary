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
});
