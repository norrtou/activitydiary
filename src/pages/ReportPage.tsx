/**
 * Print-friendly activity report, rendered outside the app chrome.
 * The browser's print dialog ("Save as PDF") turns it into a shareable file —
 * no PDF library needed, and the result is selectable, accessible text.
 * Forced to light theme while open so the paper output is always readable.
 */
import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useI18n } from '../i18n';
import { entriesForRange } from '../lib/db';
import { categoryName } from '../lib/categoryName';
import { swatchColor } from '../lib/palette';
import {
  activeDayCount,
  categoryTotals,
  sleepAveragePerActiveDay,
} from '../lib/stats';
import {
  formatDuration,
  formatDayHeading,
  formatShortDate,
  minutesToHHMM,
  startOfWeek,
  addDays,
  toDateKey,
} from '../lib/time';
import { useActiveCategories, useCategoryMap } from '../components/useCategories';
import { useSettings } from '../lib/settings';

const ENERGY_GLYPH: Record<number, string> = { [-2]: '−−', [-1]: '−', 0: '0', 1: '+', 2: '++' };
const MOOD_GLYPH: Record<number, string> = { 1: '😞', 2: '🙁', 3: '😐', 4: '🙂', 5: '😄' };

export function ReportPage() {
  const { t, locale } = useI18n();
  const settings = useSettings();
  const [params] = useSearchParams();

  const defaultFrom = startOfWeek(toDateKey(), settings.firstDayOfWeek);
  const from = params.get('from') ?? defaultFrom;
  const to = params.get('to') ?? addDays(defaultFrom, 6);

  const entries = useLiveQuery(() => entriesForRange(from, to), [from, to]);
  const categories = useActiveCategories() ?? [];
  const categoryMap = useCategoryMap();

  // Reports print on paper: force light theme while this page is open.
  useEffect(() => {
    const previous = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = 'light';
    return () => {
      document.documentElement.dataset.theme = previous;
    };
  }, []);

  if (!entries) return null;

  const dayCount = activeDayCount(entries);
  const totals = categoryTotals(entries, Math.max(dayCount, 1)).sort(
    (a, b) => b.minutes - a.minutes,
  );
  const registeredMin = totals.reduce((s, tot) => s + tot.minutes, 0);
  const sleepAvg = sleepAveragePerActiveDay(entries, categories);
  const hourUnit = t('common.hourUnit');
  const minUnit = t('common.minUnit');

  const byDay = new Map<string, typeof entries>();
  for (const e of entries) {
    const list = byDay.get(e.date) ?? [];
    list.push(e);
    byDay.set(e.date, list);
  }

  return (
    <main className="report">
      <div className="report-toolbar no-print">
        <Link to="/export">← {t('export.title')}</Link>
        <div>
          <span className="muted">{t('report.printHint')} </span>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            {t('report.print')}
          </button>
        </div>
      </div>

      <h1>{t('report.title')}</h1>
      <p>
        {t('report.period', {
          from: formatShortDate(from, locale),
          to: formatShortDate(to, locale),
        })}
      </p>

      <section>
        <h2>{t('insights.numbers')}</h2>
        <table>
          <thead>
            <tr>
              <th scope="col">{t('insights.category')}</th>
              <th scope="col">{t('common.hours')}</th>
              <th scope="col">{t('insights.share')}</th>
              <th scope="col">{t('insights.avgPerDay')}</th>
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
                      style={{ background: swatchColor(cat.swatchId, 'light') }}
                      aria-hidden
                    />{' '}
                    {cat.icon} {categoryName(cat, t)}
                  </th>
                  <td>{formatDuration(tot.minutes, hourUnit, minUnit)}</td>
                  <td>{Math.round(tot.share * 100)} %</td>
                  <td>{formatDuration(Math.round(tot.avgPerDayMin), hourUnit, minUnit)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">{t('insights.total')}</th>
              <td>{formatDuration(registeredMin, hourUnit, minUnit)}</td>
              <td>100 %</td>
              <td>
                {dayCount > 0
                  ? formatDuration(Math.round(registeredMin / dayCount), hourUnit, minUnit)
                  : '–'}
              </td>
            </tr>
          </tfoot>
        </table>
        {sleepAvg != null && sleepAvg > 0 && (
          <p>
            {t('insights.sleepAvg')}: <strong>{formatDuration(Math.round(sleepAvg), hourUnit, minUnit)}</strong>
          </p>
        )}
      </section>

      <section>
        <h2>{t('report.dailyLog')}</h2>
        {[...byDay.entries()].map(([date, dayEntries]) => (
          <div key={date} className="report-day">
            <h3>{formatDayHeading(date, locale)}</h3>
            <table>
              <thead>
                <tr>
                  <th scope="col">{t('report.time')}</th>
                  <th scope="col">{t('report.activity')}</th>
                  <th scope="col">{t('report.energyShort')}</th>
                  <th scope="col">{t('report.moodShort')}</th>
                  <th scope="col">{t('entry.note', { optional: '' }).replace(' ()', '')}</th>
                </tr>
              </thead>
              <tbody>
                {dayEntries.map((e) => {
                  const cat = categoryMap.get(e.categoryId);
                  return (
                    <tr key={e.id}>
                      <td>
                        {minutesToHHMM(e.startMin)}–{minutesToHHMM(e.endMin)}
                      </td>
                      <td>
                        {cat ? `${cat.icon} ${categoryName(cat, t)}` : ''}
                        {e.label ? ` · ${e.label}` : ''}
                      </td>
                      <td>{e.energy != null ? ENERGY_GLYPH[e.energy] : ''}</td>
                      <td>{e.mood != null ? MOOD_GLYPH[e.mood] : ''}</td>
                      <td className="report-note">{e.note ?? ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      <p className="muted report-footer">
        {t('report.generated', {
          date: new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date()),
        })}
      </p>
    </main>
  );
}
