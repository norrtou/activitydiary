/**
 * Insights view — occupational balance in pictures and numbers.
 *
 * A period picker (week/month with prev/next) drives every card:
 * stat tiles, balance donut, activity clock, day-by-day stacked bars,
 * energy & mood trends, and the numbers table.
 */
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useI18n } from '../i18n';
import { entriesForRange } from '../lib/db';
import { resolveTheme, useSettings } from '../lib/settings';
import { swatchColor } from '../lib/palette';
import { categoryName } from '../lib/categoryName';
import {
  activeDayCount,
  categoryTotals,
  dailyRatingAverage,
  hourlyCategoryFractions,
  perDayCategoryMinutes,
  sleepAveragePerActiveDay,
} from '../lib/stats';
import {
  addDays,
  formatDuration,
  fromDateKey,
  isoWeekNumber,
  startOfWeek,
  toDateKey,
  weekDays,
} from '../lib/time';
import { useActiveCategories, useCategoryMap } from '../components/useCategories';
import { BalanceDonut } from '../components/charts/BalanceDonut';
import { ActivityClock } from '../components/charts/ActivityClock';
import { DailyStacked } from '../components/charts/DailyStacked';
import { TrendChart } from '../components/charts/TrendChart';
import { ChartLegend, hoursLabel } from '../components/charts/common';
import { IconChevronLeft, IconChevronRight } from '../components/icons';

type PeriodMode = 'week' | 'month';

function monthDays(anchor: string): string[] {
  const d = fromDateKey(anchor);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const days: string[] = [];
  const cur = new Date(first);
  while (cur.getMonth() === first.getMonth()) {
    days.push(toDateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export function InsightsPage() {
  const { t, locale } = useI18n();
  const settings = useSettings();
  const mode = resolveTheme(settings.theme);

  const [period, setPeriod] = useState<PeriodMode>('week');
  const [anchor, setAnchor] = useState(toDateKey());

  const days =
    period === 'week'
      ? weekDays(startOfWeek(anchor, settings.firstDayOfWeek))
      : monthDays(anchor);

  const entries = useLiveQuery(
    () => entriesForRange(days[0], days[days.length - 1]),
    [days[0], days[days.length - 1]],
  );
  const categories = useActiveCategories() ?? [];
  const categoryMap = useCategoryMap();

  const shift = (dir: 1 | -1) => {
    if (period === 'week') {
      setAnchor(addDays(startOfWeek(anchor, settings.firstDayOfWeek), dir * 7));
    } else {
      const d = fromDateKey(anchor);
      setAnchor(toDateKey(new Date(d.getFullYear(), d.getMonth() + dir, 1)));
    }
  };

  const title =
    period === 'week'
      ? t('week.title', { num: isoWeekNumber(days[3]) })
      : new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
          fromDateKey(days[0]),
        );

  if (!entries) return null;

  const totals = categoryTotals(entries);
  const usedCategories = categories.filter((c) =>
    totals.some((tot) => tot.categoryId === c.id && tot.minutes > 0),
  );
  const registeredMin = totals.reduce((s, tot) => s + tot.minutes, 0);
  const activeDays = activeDayCount(entries);
  const sleepAvg = sleepAveragePerActiveDay(entries, categories);
  const energy = dailyRatingAverage(entries, 'energy');
  const moodValues = dailyRatingAverage(entries, 'mood');

  const hourUnit = t('common.hourUnit');
  const minUnit = t('common.minUnit');

  return (
    <>
      <header className="page-header">
        <button type="button" className="icon-btn" aria-label={t('insights.period.previous')} onClick={() => shift(-1)}>
          <IconChevronLeft />
        </button>
        <div className="day-title">
          <h1 style={{ textTransform: 'capitalize' }}>{title}</h1>
          <div className="chip-row period-toggle">
            <label className="chip chip-small">
              <input type="radio" name="period" checked={period === 'week'} onChange={() => setPeriod('week')} />
              <span>{t('insights.period.week')}</span>
            </label>
            <label className="chip chip-small">
              <input type="radio" name="period" checked={period === 'month'} onChange={() => setPeriod('month')} />
              <span>{t('insights.period.month')}</span>
            </label>
          </div>
        </div>
        <button type="button" className="icon-btn" aria-label={t('insights.period.next')} onClick={() => shift(1)}>
          <IconChevronRight />
        </button>
      </header>

      {entries.length === 0 ? (
        <p className="muted">{t('insights.noData')}</p>
      ) : (
        <div className="insights-grid">
          <div className="stat-tiles">
            <div className="card stat-tile">
              <span className="stat-value">
                {formatDuration(Math.round(registeredMin), hourUnit, minUnit)}
              </span>
              <span className="stat-label">{t('insights.registeredTime')}</span>
            </div>
            {sleepAvg != null && sleepAvg > 0 && (
              <div className="card stat-tile">
                <span className="stat-value">
                  {formatDuration(Math.round(sleepAvg), hourUnit, minUnit)}
                </span>
                <span className="stat-label">{t('insights.sleepAvg')}</span>
              </div>
            )}
            <div className="card stat-tile">
              <span className="stat-value">
                {activeDays}/{days.length}
              </span>
              <span className="stat-label">{t('insights.activeDays')}</span>
            </div>
          </div>

          <section className="card chart-card">
            <h2>{t('insights.balance')}</h2>
            <p className="muted">{t('insights.balanceHint')}</p>
            <BalanceDonut totals={totals} categories={categoryMap} mode={mode} />
            <ChartLegend categories={usedCategories} mode={mode} />
          </section>

          <section className="card chart-card">
            <h2>{t('insights.clock')}</h2>
            <p className="muted">{t('insights.clockHint')}</p>
            <ActivityClock
              hourly={hourlyCategoryFractions(entries, activeDays)}
              categories={usedCategories}
              categoryMap={categoryMap}
              mode={mode}
            />
            <ChartLegend categories={usedCategories} mode={mode} />
          </section>

          <section className="card chart-card chart-card-wide">
            <h2>{t('insights.perDay')}</h2>
            <p className="muted">{t('insights.perDayHint')}</p>
            <DailyStacked
              days={days}
              perDay={perDayCategoryMinutes(entries, days)}
              categories={categories}
              mode={mode}
              monthly={period === 'month'}
            />
            <ChartLegend categories={usedCategories} mode={mode} />
          </section>

          {energy.size > 0 && (
            <section className="card chart-card">
              <h2>{t('insights.energy')}</h2>
              <p className="muted">{t('insights.energyHint')}</p>
              <TrendChart
                days={days}
                values={energy}
                domain={[-2, 2]}
                color={swatchColor('blue', mode)}
                zeroLine
                monthly={period === 'month'}
              />
            </section>
          )}

          {moodValues.size > 0 && (
            <section className="card chart-card">
              <h2>{t('insights.mood')}</h2>
              <p className="muted">{t('insights.moodHint')}</p>
              <TrendChart
                days={days}
                values={moodValues}
                domain={[1, 5]}
                color={swatchColor('aqua', mode)}
                monthly={period === 'month'}
              />
            </section>
          )}

          <section className="card chart-card chart-card-wide">
            <h2>{t('insights.numbers')}</h2>
            <p className="muted">{t('insights.numbersHint')}</p>
            <div className="table-scroll">
              <table className="numbers-table">
                <thead>
                  <tr>
                    <th scope="col">{t('insights.category')}</th>
                    <th scope="col">{t('common.hours')}</th>
                    <th scope="col">{t('insights.share')}</th>
                    <th scope="col">{t('insights.avgPerDay')}</th>
                  </tr>
                </thead>
                <tbody>
                  {totals
                    .filter((tot) => tot.minutes > 0)
                    .sort((a, b) => b.minutes - a.minutes)
                    .map((tot) => {
                      const cat = categoryMap.get(tot.categoryId);
                      if (!cat) return null;
                      return (
                        <tr key={tot.categoryId}>
                          <th scope="row">
                            <span
                              className="legend-dot"
                              style={{ background: swatchColor(cat.swatchId, mode) }}
                              aria-hidden
                            />
                            <span aria-hidden>{cat.icon}</span> {categoryName(cat, t)}
                          </th>
                          <td>{hoursLabel(tot.minutes, locale, hourUnit)}</td>
                          <td>{Math.round(tot.share * 100)} %</td>
                          <td>{formatDuration(Math.round(tot.avgPerDayMin), hourUnit, minUnit)}</td>
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">{t('insights.total')}</th>
                    <td>{hoursLabel(registeredMin, locale, hourUnit)}</td>
                    <td>100 %</td>
                    <td>
                      {formatDuration(Math.round(registeredMin / activeDays), hourUnit, minUnit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
