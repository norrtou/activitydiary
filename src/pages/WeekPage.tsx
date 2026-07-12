/**
 * Week view — a 7-column color map of the week. Each day is a miniature of
 * the day timeline; tapping a day opens it in the Today view.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useI18n } from '../i18n';
import { entriesForRange } from '../lib/db';
import { useSettings } from '../lib/settings';
import { swatchColor } from '../lib/palette';
import {
  addDays,
  formatShortDate,
  formatWeekdayShort,
  isoWeekNumber,
  startOfWeek,
  toDateKey,
  weekDays,
  DAY_MIN,
} from '../lib/time';
import { useCategoryMap } from '../components/useCategories';
import { IconChevronLeft, IconChevronRight } from '../components/icons';
import type { Entry } from '../lib/types';

const DAY_COLUMN_HEIGHT = 288; // px for 24 h => 12 px per hour

export function WeekPage() {
  const { t, locale } = useI18n();
  const settings = useSettings();
  const categories = useCategoryMap();

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(toDateKey(), settings.firstDayOfWeek),
  );
  const days = weekDays(weekStart);
  const entries =
    useLiveQuery(() => entriesForRange(days[0], days[6]), [weekStart]) ?? [];

  const byDay = new Map<string, Entry[]>(days.map((d) => [d, []]));
  for (const e of entries) byDay.get(e.date)?.push(e);

  const today = toDateKey();
  const isCurrentWeek = weekStart === startOfWeek(today, settings.firstDayOfWeek);

  return (
    <>
      <header className="page-header">
        <button
          type="button"
          className="icon-btn"
          aria-label={t('week.previous')}
          onClick={() => setWeekStart(addDays(weekStart, -7))}
        >
          <IconChevronLeft />
        </button>
        <div className="day-title">
          <h1>{t('week.title', { num: isoWeekNumber(days[3]) })}</h1>
          <p className="muted">
            {formatShortDate(days[0], locale)} – {formatShortDate(days[6], locale)}
            {!isCurrentWeek && (
              <>
                {' · '}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => setWeekStart(startOfWeek(today, settings.firstDayOfWeek))}
                >
                  {t('week.thisWeek')}
                </button>
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label={t('week.next')}
          onClick={() => setWeekStart(addDays(weekStart, 7))}
        >
          <IconChevronRight />
        </button>
      </header>

      <div className="card week-grid-card">
        <div className="week-grid">
          {days.map((day) => (
            <Link
              key={day}
              to={day === today ? '/today' : `/day/${day}`}
              className={`week-day${day === today ? ' is-today' : ''}`}
              aria-label={t('week.openDay', { date: formatShortDate(day, locale) })}
            >
              <span className="week-day-name">{formatWeekdayShort(day, locale)}</span>
              <span className="week-day-date">{formatShortDate(day, locale)}</span>
              <span className="week-day-col" style={{ height: DAY_COLUMN_HEIGHT }} aria-hidden>
                {(byDay.get(day) ?? []).map((e) => {
                  const cat = categories.get(e.categoryId);
                  if (!cat) return null;
                  return (
                    <span
                      key={e.id}
                      className="week-block"
                      style={{
                        top: (e.startMin / DAY_MIN) * DAY_COLUMN_HEIGHT,
                        height: Math.max(
                          ((e.endMin - e.startMin) / DAY_MIN) * DAY_COLUMN_HEIGHT,
                          2,
                        ),
                        background: swatchColor(cat.swatchId),
                      }}
                    />
                  );
                })}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
