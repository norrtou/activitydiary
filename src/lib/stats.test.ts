import { describe, expect, it } from 'vitest';
import {
  activeDayCount,
  categoryRatingAverages,
  categoryTotals,
  dailyRatingAverage,
  hourlyCategoryFractions,
  perDayCategoryMinutes,
} from './stats';
import type { Entry } from './types';

const entries: Entry[] = [
  { id: 1, date: '2026-07-01', startMin: 0, endMin: 420, categoryId: 1 }, // sleep 7 h
  { id: 2, date: '2026-07-01', startMin: 480, endMin: 960, categoryId: 2, energy: -1 }, // work 8 h
  { id: 3, date: '2026-07-01', startMin: 1020, endMin: 1140, categoryId: 3, energy: 2, mood: 5 },
  { id: 4, date: '2026-07-02', startMin: 0, endMin: 480, categoryId: 1 }, // sleep 8 h
];

describe('categoryTotals', () => {
  it('sums minutes, shares and averages per registered day', () => {
    const totals = categoryTotals(entries);
    const sleep = totals.find((t) => t.categoryId === 1)!;
    expect(sleep.minutes).toBe(900);
    // Two days have entries — empty days must not dilute the average.
    expect(sleep.avgPerDayMin).toBeCloseTo(900 / 2);
    const sum = totals.reduce((s, t) => s + t.share, 0);
    expect(sum).toBeCloseTo(1);
  });

  it('is empty for no entries', () => {
    expect(categoryTotals([])).toEqual([]);
  });
});

describe('perDayCategoryMinutes', () => {
  it('groups by day and category', () => {
    const perDay = perDayCategoryMinutes(entries, ['2026-07-01', '2026-07-02', '2026-07-03']);
    expect(perDay.get('2026-07-01')!.get(2)).toBe(480);
    expect(perDay.get('2026-07-02')!.get(1)).toBe(480);
    expect(perDay.get('2026-07-03')!.size).toBe(0);
  });
});

describe('dailyRatingAverage', () => {
  it('weights by duration and skips unrated entries', () => {
    const energy = dailyRatingAverage(entries, 'energy');
    // Day 1: work 480 min at −1, leisure 120 min at +2 → (−480+240)/600 = −0.4
    expect(energy.get('2026-07-01')).toBeCloseTo(-0.4);
    expect(energy.has('2026-07-02')).toBe(false);
  });
});

describe('categoryRatingAverages', () => {
  it('averages per category, weighted by duration', () => {
    const withTwoRatedWork: Entry[] = [
      ...entries,
      { id: 5, date: '2026-07-02', startMin: 480, endMin: 720, categoryId: 2, energy: 1 }, // work 4 h at +1
    ];
    const energy = categoryRatingAverages(withTwoRatedWork, 'energy');
    const work = energy.find((r) => r.categoryId === 2)!;
    // work: 480 min at −1, 240 min at +1 → (−480+240)/720 = −1/3
    expect(work.avg).toBeCloseTo(-1 / 3);
    expect(work.minutes).toBe(720);
  });

  it('skips categories without any rated entries', () => {
    const energy = categoryRatingAverages(entries, 'energy');
    expect(energy.some((r) => r.categoryId === 1)).toBe(false); // sleep never rated
    const mood = categoryRatingAverages(entries, 'mood');
    expect(mood.map((r) => r.categoryId)).toEqual([3]);
    expect(mood[0].avg).toBe(5);
  });
});

describe('hourlyCategoryFractions', () => {
  it('averages hour coverage over active days', () => {
    const hourly = hourlyCategoryFractions(entries, 2);
    // Hour 0–1 is fully slept on both days → fraction 1.
    expect(hourly.get(0)!.get(1)).toBeCloseTo(1);
    // Hour 7 (07:00–08:00): slept only on day 2 → fraction 0.5.
    expect(hourly.get(7)!.get(1)).toBeCloseTo(0.5);
  });
});

describe('activeDayCount', () => {
  it('counts distinct days', () => {
    expect(activeDayCount(entries)).toBe(2);
  });
});
