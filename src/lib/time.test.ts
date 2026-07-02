import { describe, expect, it } from 'vitest';
import {
  addDays,
  isoWeekNumber,
  minutesToHHMM,
  parseHHMM,
  rangesOverlap,
  snapMinutes,
  splitOverMidnight,
  startOfWeek,
  weekDays,
} from './time';

describe('parseHHMM / minutesToHHMM', () => {
  it('round-trips typical times', () => {
    for (const text of ['00:00', '06:30', '13:05', '23:59']) {
      expect(minutesToHHMM(parseHHMM(text)!)).toBe(text);
    }
  });

  it('rejects malformed input', () => {
    expect(parseHHMM('25:00')).toBeNull();
    expect(parseHHMM('12:60')).toBeNull();
    expect(parseHHMM('12.30')).toBeNull();
    expect(parseHHMM('')).toBeNull();
  });

  it('accepts 24:00 as end-of-day', () => {
    expect(parseHHMM('24:00')).toBe(1440);
  });
});

describe('snapMinutes', () => {
  it('snaps to the grid and clamps to the day', () => {
    expect(snapMinutes(437, 30)).toBe(450);
    expect(snapMinutes(437, 15)).toBe(435);
    expect(snapMinutes(-20, 30)).toBe(0);
    expect(snapMinutes(2000, 30)).toBe(1440);
  });
});

describe('splitOverMidnight', () => {
  it('keeps a same-day range intact', () => {
    expect(splitOverMidnight('2026-07-01', 480, 540)).toEqual([
      { date: '2026-07-01', startMin: 480, endMin: 540 },
    ]);
  });

  it('splits a sleep entry crossing midnight onto both days', () => {
    expect(splitOverMidnight('2026-07-01', 23 * 60, 7 * 60)).toEqual([
      { date: '2026-07-01', startMin: 1380, endMin: 1440 },
      { date: '2026-07-02', startMin: 0, endMin: 420 },
    ]);
  });

  it('handles ranges ending exactly at midnight', () => {
    expect(splitOverMidnight('2026-07-01', 1380, 0)).toEqual([
      { date: '2026-07-01', startMin: 1380, endMin: 1440 },
    ]);
  });
});

describe('week helpers', () => {
  it('startOfWeek respects Monday and Sunday starts', () => {
    // 2026-07-02 is a Thursday.
    expect(startOfWeek('2026-07-02', 1)).toBe('2026-06-29');
    expect(startOfWeek('2026-07-02', 0)).toBe('2026-06-28');
  });

  it('weekDays returns seven consecutive days', () => {
    const days = weekDays('2026-06-29');
    expect(days).toHaveLength(7);
    expect(days[6]).toBe('2026-07-05');
  });

  it('addDays crosses month boundaries', () => {
    expect(addDays('2026-06-30', 1)).toBe('2026-07-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('isoWeekNumber matches the Swedish calendar', () => {
    expect(isoWeekNumber('2026-01-01')).toBe(1);
    expect(isoWeekNumber('2026-07-02')).toBe(27);
    expect(isoWeekNumber('2026-12-31')).toBe(53);
  });
});

describe('rangesOverlap', () => {
  it('detects overlap and adjacency correctly', () => {
    expect(rangesOverlap({ startMin: 0, endMin: 60 }, { startMin: 30, endMin: 90 })).toBe(true);
    expect(rangesOverlap({ startMin: 0, endMin: 60 }, { startMin: 60, endMin: 90 })).toBe(false);
  });
});
