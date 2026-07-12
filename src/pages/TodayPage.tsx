/**
 * Today view — the home screen. A day heading with date navigation, the
 * 24-hour timeline, and a floating + button for quick registration.
 */
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useI18n } from '../i18n';
import { entriesForDate } from '../lib/db';
import {
  addDays,
  formatDayHeading,
  nowMinutes,
  snapMinutes,
  toDateKey,
} from '../lib/time';
import { useSettings } from '../lib/settings';
import { useActiveCategories, useCategoryMap } from '../components/useCategories';
import { DayTimeline, type RangeDraft } from '../components/DayTimeline';
import { EntrySheet, type SheetDraft } from '../components/EntrySheet';
import { IconChevronLeft, IconChevronRight, IconPlus } from '../components/icons';
import type { Entry } from '../lib/types';

export function TodayPage() {
  const { t, locale } = useI18n();
  const params = useParams<{ date?: string }>();
  const navigate = useNavigate();
  const settings = useSettings();

  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : toDateKey();
  const isToday = date === toDateKey();

  const entries = useLiveQuery(() => entriesForDate(date), [date]) ?? [];
  const categories = useActiveCategories();
  const categoryMap = useCategoryMap();

  const [draft, setDraft] = useState<SheetDraft | null>(null);

  const goTo = (key: string) => navigate(key === toDateKey() ? '/today' : `/day/${key}`);

  const registeredMin = useMemo(
    () => entries.reduce((sum, e) => sum + (e.endMin - e.startMin), 0),
    [entries],
  );

  const openNew = (range?: RangeDraft) => {
    const start = range?.startMin ?? snapMinutes(nowMinutes() - 60, settings.slotMinutes);
    const end = range?.endMin ?? Math.min(start + 60, 1440);
    setDraft({ date, startMin: start, endMin: end });
  };

  const openEdit = (entry: Entry) => {
    setDraft({ date, startMin: entry.startMin, endMin: entry.endMin, entry });
  };

  return (
    <>
      <header className="page-header day-header">
        <button
          type="button"
          className="icon-btn"
          aria-label={t('today.previousDay')}
          onClick={() => goTo(addDays(date, -1))}
        >
          <IconChevronLeft />
        </button>
        <div className="day-title">
          <h1>{isToday ? t('common.today') : formatDayHeading(date, locale)}</h1>
          {isToday && <p className="muted">{formatDayHeading(date, locale)}</p>}
          <label className="visually-hidden" htmlFor="day-picker">
            {t('today.pickDate')}
          </label>
          <input
            id="day-picker"
            className="day-picker"
            type="date"
            lang={locale}
            value={date}
            onChange={(e) => e.target.value && goTo(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label={t('today.nextDay')}
          onClick={() => goTo(addDays(date, 1))}
        >
          <IconChevronRight />
        </button>
      </header>

      <p className="muted day-summary">
        {entries.length === 0
          ? t('today.emptyHint')
          : t('today.registered', {
              hours: (registeredMin / 60).toLocaleString(locale, { maximumFractionDigits: 1 }),
              total: 24,
            })}
      </p>

      <div className="card timeline-card">
        <DayTimeline
          date={date}
          entries={entries}
          categories={categoryMap}
          onCreate={(range) => openNew(range)}
          onEdit={openEdit}
        />
      </div>

      <button type="button" className="fab" aria-label={t('today.addActivity')} onClick={() => openNew()}>
        <IconPlus />
      </button>

      {draft && categories && (
        <EntrySheet draft={draft} categories={categories} onClose={() => setDraft(null)} />
      )}
    </>
  );
}
