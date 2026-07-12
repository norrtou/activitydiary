/**
 * One-page visual activity report.
 *
 * The report is a fixed A4 sheet: what you see on screen is exactly what the
 * browser's print dialog ("Save as PDF") produces — a single page, primarily
 * visual. A toolbar (hidden in print) lets the user compose the page: how the
 * balance is drawn (donut or bars), and whether to include the activity
 * clock, day-by-day bars, energy/mood curves, key figures and the numbers
 * table. Choices persist in localStorage.
 */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useI18n } from '../i18n';
import { entriesForRange } from '../lib/db';
import { categoryName } from '../lib/categoryName';
import { swatchColor } from '../lib/palette';
import {
  activeDayCount,
  categoryRatingAverages,
  categoryTotals,
  dailyRatingAverage,
  hourlyCategoryFractions,
  perDayCategoryMinutes,
  sleepAveragePerActiveDay,
} from '../lib/stats';
import {
  addDays,
  formatDuration,
  formatShortDate,
  startOfWeek,
  toDateKey,
} from '../lib/time';
import { useActiveCategories, useCategoryMap } from '../components/useCategories';
import { useSettings } from '../lib/settings';
import { BalanceDonut } from '../components/charts/BalanceDonut';
import { ActivityClock } from '../components/charts/ActivityClock';
import { DailyStacked } from '../components/charts/DailyStacked';
import { ExperienceBars } from '../components/charts/ExperienceBars';
import { TrendChart } from '../components/charts/TrendChart';
import { ChartLegend, hoursLabel } from '../components/charts/common';
import { IconLogo } from '../components/icons';
import type { Category } from '../lib/types';

interface ReportOptions {
  balance: 'donut' | 'bars' | 'none';
  clock: boolean;
  perDay: boolean;
  /** How activities feel: energy/mood per activity — the occupational core. */
  experience: boolean;
  trends: boolean;
  figures: boolean;
  table: boolean;
}

const OPTIONS_KEY = 'activity-diary.report-options';

const DEFAULT_OPTIONS: ReportOptions = {
  balance: 'donut',
  clock: true,
  perDay: true,
  experience: true,
  trends: false,
  figures: true,
  table: false,
};

function loadOptions(): ReportOptions {
  try {
    const raw = localStorage.getItem(OPTIONS_KEY);
    if (!raw) return DEFAULT_OPTIONS;
    return { ...DEFAULT_OPTIONS, ...(JSON.parse(raw) as Partial<ReportOptions>) };
  } catch {
    return DEFAULT_OPTIONS;
  }
}

/** Mean of the per-day averages, or null when no day has a rating. */
function periodAverage(perDay: Map<string, number>): number | null {
  if (perDay.size === 0) return null;
  let sum = 0;
  for (const v of perDay.values()) sum += v;
  return sum / perDay.size;
}

/** Horizontal balance bars: name · thin colored bar · hours and share. */
function BalanceBars({
  totals,
  categoryMap,
}: {
  totals: ReturnType<typeof categoryTotals>;
  categoryMap: Map<number, Category>;
}) {
  const { t, locale } = useI18n();
  const hourUnit = t('common.hourUnit');
  const maxShare = totals.reduce((m, tot) => Math.max(m, tot.share), 0);
  return (
    <div className="report-bars">
      {totals.map((tot) => {
        const cat = categoryMap.get(tot.categoryId);
        if (!cat) return null;
        return (
          <div key={tot.categoryId} className="rbar">
            <span className="rbar-name">
              <span
                className="legend-dot"
                style={{ background: swatchColor(cat.swatchId) }}
                aria-hidden
              />
              {categoryName(cat, t)}
            </span>
            <span className="rbar-track" aria-hidden>
              <span
                className="rbar-fill"
                style={{
                  width: `${maxShare > 0 ? (tot.share / maxShare) * 100 : 0}%`,
                  background: swatchColor(cat.swatchId),
                }}
              />
            </span>
            <span className="rbar-val">
              {hoursLabel(tot.minutes, locale, hourUnit)} · {Math.round(tot.share * 100)} %
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ReportPage() {
  const { t, locale } = useI18n();
  const settings = useSettings();
  const [params] = useSearchParams();
  const [options, setOptions] = useState<ReportOptions>(loadOptions);

  const setOption = <K extends keyof ReportOptions>(key: K, value: ReportOptions[K]) => {
    const next = { ...options, [key]: value };
    setOptions(next);
    try {
      localStorage.setItem(OPTIONS_KEY, JSON.stringify(next));
    } catch {
      // Non-fatal: choices just won't persist.
    }
  };

  const defaultFrom = startOfWeek(toDateKey(), settings.firstDayOfWeek);
  const from = params.get('from') ?? defaultFrom;
  const to = params.get('to') ?? addDays(defaultFrom, 6);

  const entries = useLiveQuery(() => entriesForRange(from, to), [from, to]);
  const categories = useActiveCategories() ?? [];
  const categoryMap = useCategoryMap();

  if (!entries) return null;

  // Day list for the per-day and trend charts (cap at 31 for sane bars).
  const days: string[] = [];
  for (let d = from; d <= to && days.length < 31; d = addDays(d, 1)) days.push(d);
  const isWeek = days.length <= 7;

  const dayCount = activeDayCount(entries);
  const totals = categoryTotals(entries)
    .filter((tot) => tot.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
  const registeredMin = totals.reduce((s, tot) => s + tot.minutes, 0);
  const usedCategories = categories.filter((c) =>
    totals.some((tot) => tot.categoryId === c.id),
  );
  const sleepAvg = sleepAveragePerActiveDay(entries, categories);
  const energy = dailyRatingAverage(entries, 'energy');
  const mood = dailyRatingAverage(entries, 'mood');
  const energyAvg = periodAverage(energy);
  const moodAvg = periodAverage(mood);
  const hourUnit = t('common.hourUnit');
  const minUnit = t('common.minUnit');

  const ratingFormat = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  });
  const moodFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  const energyPerActivity = categoryRatingAverages(entries, 'energy');
  const moodPerActivity = categoryRatingAverages(entries, 'mood');

  const showTrends = options.trends && (energy.size > 0 || mood.size > 0);
  const showExperience =
    options.experience && (energyPerActivity.length > 0 || moodPerActivity.length > 0);
  const showLegend = options.balance !== 'none' || options.clock || options.perDay;

  return (
    <div className="report-page">
      <div className="report-toolbar no-print">
        <div className="report-toolbar-row">
          <Link to="/export">← {t('export.title')}</Link>
          <div>
            <span className="muted">{t('report.printHint')} </span>
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>
              {t('report.print')}
            </button>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 2 }}>{t('report.options')}</h2>
          <p className="muted" style={{ marginBottom: 12 }}>
            {t('report.onePage')}
          </p>
          <div className="report-options">
            <fieldset className="chip-group">
              <legend>{t('insights.balance')}</legend>
              <div className="chip-row">
                {(['donut', 'bars', 'none'] as const).map((style) => (
                  <label key={style} className="chip chip-small">
                    <input
                      type="radio"
                      name="balance-style"
                      checked={options.balance === style}
                      onChange={() => setOption('balance', style)}
                    />
                    <span>{t(`report.style.${style}` as const)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="chip-group">
              <legend>{t('report.modules')}</legend>
              <div className="chip-row">
                {(
                  [
                    ['figures', t('report.keyFigures')],
                    ['clock', t('insights.clock')],
                    ['perDay', t('insights.perDay')],
                    ['experience', t('insights.experience')],
                    ['trends', t('report.trends')],
                    ['table', t('insights.numbers')],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="chip chip-small">
                    <input
                      type="checkbox"
                      checked={options[key]}
                      onChange={(e) => setOption(key, e.target.checked)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>
      </div>

      <div className="report-scroll">
        <main className="report-sheet">
          <header className="report-head">
            <p className="report-brand">
              <IconLogo /> {t('app.name')}
            </p>
            <h1>{t('report.title')}</h1>
            <p className="report-meta">
              {t('report.period', {
                from: formatShortDate(from, locale),
                to: formatShortDate(to, locale),
              })}
            </p>
            <hr className="report-rule" />
          </header>

          {options.figures && (
            <section className="report-figures" aria-label={t('report.keyFigures')}>
              <div className="report-figure">
                <strong>{formatDuration(registeredMin, hourUnit, minUnit)}</strong>
                <span>{t('insights.registeredTime')}</span>
              </div>
              <div className="report-figure">
                <strong>{dayCount}</strong>
                <span>{t('insights.activeDays')}</span>
              </div>
              {sleepAvg != null && sleepAvg > 0 && (
                <div className="report-figure">
                  <strong>{formatDuration(Math.round(sleepAvg), hourUnit, minUnit)}</strong>
                  <span>{t('insights.sleepAvg')}</span>
                </div>
              )}
              {energyAvg != null && (
                <div className="report-figure">
                  <strong>{ratingFormat.format(energyAvg)}</strong>
                  <span>{t('report.avgEnergy')}</span>
                </div>
              )}
              {moodAvg != null && (
                <div className="report-figure">
                  <strong>{moodFormat.format(moodAvg)}/5</strong>
                  <span>{t('report.avgMood')}</span>
                </div>
              )}
            </section>
          )}

          <div className="report-grid">
            {options.balance === 'donut' && (
              <section className="report-module">
                <h3>{t('insights.balance')}</h3>
                <p className="report-module-hint">{t('insights.balanceHint')}</p>
                <BalanceDonut totals={totals} categories={categoryMap} height={180} />
              </section>
            )}
            {options.balance === 'bars' && (
              <section className="report-module">
                <h3>{t('insights.balance')}</h3>
                <p className="report-module-hint">{t('insights.balanceHint')}</p>
                <BalanceBars totals={totals} categoryMap={categoryMap} />
              </section>
            )}

            {options.clock && (
              <section className="report-module">
                <h3>{t('insights.clock')}</h3>
                <p className="report-module-hint">{t('insights.clockHint')}</p>
                <ActivityClock
                  hourly={hourlyCategoryFractions(entries, dayCount)}
                  categories={usedCategories}
                  categoryMap={categoryMap}
                />
              </section>
            )}

            {showLegend && (
              <div className="report-module report-module-wide">
                <ChartLegend categories={usedCategories} />
              </div>
            )}

            {options.perDay && (
              <section className="report-module report-module-wide">
                <h3>{t('insights.perDay')}</h3>
                <p className="report-module-hint">{t('insights.perDayHint')}</p>
                <DailyStacked
                  days={days}
                  perDay={perDayCategoryMinutes(entries, days)}
                  categories={categories}
                  monthly={!isWeek}
                  height={140}
                />
              </section>
            )}

            {showExperience && (
              <section className="report-module report-module-wide">
                <h3>{t('insights.experience')}</h3>
                <p className="report-module-hint">{t('insights.experienceHint')}</p>
                <div className="xp-grid">
                  {energyPerActivity.length > 0 && (
                    <div>
                      <h4 className="xp-title">{t('insights.exp.energyTitle')}</h4>
                      <ExperienceBars
                        ratings={energyPerActivity}
                        categoryMap={categoryMap}
                        center={0}
                        range={2}
                        negLabel={t('insights.exp.takes')}
                        posLabel={t('insights.exp.gives')}
                        signed
                      />
                    </div>
                  )}
                  {moodPerActivity.length > 0 && (
                    <div>
                      <h4 className="xp-title">{t('insights.exp.moodTitle')}</h4>
                      <ExperienceBars
                        ratings={moodPerActivity}
                        categoryMap={categoryMap}
                        center={3}
                        range={2}
                        negLabel={t('insights.exp.bad')}
                        posLabel={t('insights.exp.good')}
                      />
                    </div>
                  )}
                </div>
              </section>
            )}

            {showTrends && (
              <>
                {energy.size > 0 && (
                  <section className="report-module">
                    <h3>{t('insights.energy')}</h3>
                    <p className="report-module-hint">{t('insights.energyHint')}</p>
                    <TrendChart
                      days={days}
                      values={energy}
                      domain={[-2, 2]}
                      color={swatchColor('blue')}
                      zeroLine
                      monthly={!isWeek}
                      height={100}
                    />
                  </section>
                )}
                {mood.size > 0 && (
                  <section className="report-module">
                    <h3>{t('insights.mood')}</h3>
                    <p className="report-module-hint">{t('insights.moodHint')}</p>
                    <TrendChart
                      days={days}
                      values={mood}
                      domain={[1, 5]}
                      color={swatchColor('aqua')}
                      monthly={!isWeek}
                      height={100}
                    />
                  </section>
                )}
              </>
            )}

            {options.table && (
              <section className="report-module report-module-wide">
                <h3>{t('insights.numbers')}</h3>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th scope="col">{t('insights.category')}</th>
                      <th scope="col">{t('common.hours')}</th>
                      <th scope="col">{t('insights.avgPerDay')}</th>
                      <th scope="col">{t('insights.share')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {totals.map((tot) => {
                      const cat = categoryMap.get(tot.categoryId);
                      if (!cat) return null;
                      return (
                        <tr key={tot.categoryId}>
                          <th scope="row">
                            <span
                              className="legend-dot"
                              style={{ background: swatchColor(cat.swatchId), marginRight: 6 }}
                              aria-hidden
                            />
                            {categoryName(cat, t)}
                          </th>
                          <td>{hoursLabel(tot.minutes, locale, hourUnit)}</td>
                          <td>{formatDuration(Math.round(tot.avgPerDayMin), hourUnit, minUnit)}</td>
                          <td>{Math.round(tot.share * 100)} %</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row">{t('insights.total')}</th>
                      <td>{hoursLabel(registeredMin, locale, hourUnit)}</td>
                      <td>
                        {dayCount > 0
                          ? formatDuration(Math.round(registeredMin / dayCount), hourUnit, minUnit)
                          : '–'}
                      </td>
                      <td>100 %</td>
                    </tr>
                  </tfoot>
                </table>
              </section>
            )}
          </div>

          <footer className="report-foot">
            <span>
              {t('report.generated', {
                date: new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date()),
              })}
            </span>
            <span>{t('insights.numbersHint')}</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
