/**
 * Export view — three big friendly options: PDF report, CSV, JSON backup.
 * A shared period picker applies to the report and the CSV; the JSON backup
 * always contains everything (it is the safety copy).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { entriesForRange, db } from '../lib/db';
import { createBackup, downloadFile, entriesToCsv } from '../lib/export';
import { startOfWeek, toDateKey, addDays, fromDateKey } from '../lib/time';
import { useSettings } from '../lib/settings';
import { useCategoryMap } from '../components/useCategories';

type Range = 'week' | 'month' | 'all';

export function ExportPage() {
  const { t, locale } = useI18n();
  const settings = useSettings();
  const categories = useCategoryMap();
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>('week');

  const rangeDates = (): { from: string; to: string } => {
    const today = toDateKey();
    if (range === 'week') {
      const start = startOfWeek(today, settings.firstDayOfWeek);
      return { from: start, to: addDays(start, 6) };
    }
    if (range === 'month') {
      const d = fromDateKey(today);
      return {
        from: toDateKey(new Date(d.getFullYear(), d.getMonth(), 1)),
        to: toDateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
      };
    }
    return { from: '0000-01-01', to: '9999-12-31' };
  };

  const exportCsv = async () => {
    const { from, to } = rangeDates();
    const entries = await entriesForRange(from, to);
    const csv = entriesToCsv(entries, categories, t, locale);
    downloadFile(`activity-diary-${toDateKey()}.csv`, 'text/csv;charset=utf-8', csv);
  };

  const exportJson = async () => {
    const backup = await createBackup();
    downloadFile(
      `activity-diary-backup-${toDateKey()}.json`,
      'application/json',
      JSON.stringify(backup, null, 2),
    );
  };

  const openReport = async () => {
    let { from, to } = rangeDates();
    if (range === 'all') {
      // Clamp "everything" to the actual data so the report stays readable.
      const all = await db.entries.orderBy('date').keys();
      if (all.length === 0) return;
      from = String(all[0]);
      to = String(all[all.length - 1]);
    }
    navigate(`/report?from=${from}&to=${to}`);
  };

  return (
    <>
      <header className="page-header">
        <h1>{t('export.title')}</h1>
      </header>
      <p className="muted" style={{ marginBottom: 16 }}>
        {t('export.subtitle')}
      </p>

      <fieldset className="chip-group">
        <legend>{t('export.range')}</legend>
        <div className="chip-row">
          {(['week', 'month', 'all'] as const).map((r) => (
            <label key={r} className="chip">
              <input type="radio" name="range" checked={range === r} onChange={() => setRange(r)} />
              <span>{t(`export.range.${r}` as const)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="export-cards">
        <section className="card export-card">
          <span className="export-icon" aria-hidden>
            📄
          </span>
          <div className="export-text">
            <h2>{t('export.pdf')}</h2>
            <p className="muted">{t('export.pdfDesc')}</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={openReport}>
            {t('export.openReport')}
          </button>
        </section>

        <section className="card export-card">
          <span className="export-icon" aria-hidden>
            📊
          </span>
          <div className="export-text">
            <h2>{t('export.csv')}</h2>
            <p className="muted">{t('export.csvDesc')}</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={exportCsv}>
            {t('export.download')}
          </button>
        </section>

        <section className="card export-card">
          <span className="export-icon" aria-hidden>
            💾
          </span>
          <div className="export-text">
            <h2>{t('export.json')}</h2>
            <p className="muted">{t('export.jsonDesc')}</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={exportJson}>
            {t('export.download')}
          </button>
        </section>
      </div>
    </>
  );
}
