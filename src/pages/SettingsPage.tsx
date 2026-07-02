/**
 * Settings — everything that is deliberately kept out of the everyday flow:
 * language, appearance, category management, timeline preferences, and data
 * management (import, sample data, erase).
 */
import { useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { db } from '../lib/db';
import { categoryName } from '../lib/categoryName';
import { swatchColor } from '../lib/palette';
import { parseBackup, restoreBackup } from '../lib/export';
import { loadSampleWeek } from '../lib/sampleData';
import { resolveTheme, updateSettings, useSettings } from '../lib/settings';
import { useAllCategories } from '../components/useCategories';
import { CategoryDialog } from '../components/CategoryDialog';
import type { Category } from '../lib/types';

export function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const settings = useSettings();
  const mode = resolveTheme(settings.theme);
  const categories = useAllCategories() ?? [];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<Category | null | 'new'>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onImportFile = async (file: File) => {
    const backup = parseBackup(await file.text());
    if (!backup) {
      setMessage(t('settings.importError'));
      return;
    }
    if (!window.confirm(t('settings.importConfirm'))) return;
    await restoreBackup(backup);
    setMessage(t('settings.importDone'));
  };

  const eraseAll = async () => {
    if (!window.confirm(t('settings.eraseConfirm'))) return;
    await db.delete();
    localStorage.clear();
    window.location.reload();
  };

  const toggleArchived = (cat: Category) => {
    void db.categories.update(cat.id!, { archived: cat.archived ? 0 : 1 });
  };

  return (
    <>
      <header className="page-header">
        <h1>{t('settings.title')}</h1>
      </header>

      <div className="settings-stack">
        <section className="card">
          <h2>{t('settings.language')}</h2>
          <div className="chip-row" style={{ marginTop: 10 }}>
            <label className="chip">
              <input type="radio" name="lang" checked={lang === 'en'} onChange={() => setLang('en')} />
              <span>{t('settings.language.en')}</span>
            </label>
            <label className="chip">
              <input type="radio" name="lang" checked={lang === 'sv'} onChange={() => setLang('sv')} />
              <span>{t('settings.language.sv')}</span>
            </label>
          </div>
        </section>

        <section className="card">
          <h2>{t('settings.theme')}</h2>
          <div className="chip-row" style={{ marginTop: 10 }}>
            {(['light', 'dark', 'system'] as const).map((th) => (
              <label key={th} className="chip">
                <input
                  type="radio"
                  name="theme"
                  checked={settings.theme === th}
                  onChange={() => updateSettings({ theme: th })}
                />
                <span>{t(`settings.theme.${th}` as const)}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>{t('settings.categories')}</h2>
          <p className="muted">{t('settings.categoriesHint')}</p>
          <ul className="category-list">
            {categories.map((cat) => (
              <li key={cat.id} className={cat.archived ? 'is-archived' : undefined}>
                <span
                  className="legend-dot"
                  style={{ background: swatchColor(cat.swatchId, mode) }}
                  aria-hidden
                />
                <span className="category-list-name">
                  <span aria-hidden>{cat.icon}</span> {categoryName(cat, t)}
                </span>
                <button type="button" className="link-btn" onClick={() => setEditing(cat)}>
                  {t('common.edit')}
                </button>
                <button type="button" className="link-btn" onClick={() => toggleArchived(cat)}>
                  {cat.archived ? t('settings.unarchive') : t('settings.archive')}
                </button>
              </li>
            ))}
          </ul>
          <p className="muted">{t('settings.archivedHint')}</p>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ marginTop: 10 }}
            onClick={() => setEditing('new')}
          >
            + {t('settings.addCategory')}
          </button>
        </section>

        <section className="card">
          <h2>{t('settings.advanced')}</h2>
          <div className="field" style={{ marginTop: 10 }}>
            <label htmlFor="set-slot">{t('settings.slotMinutes')}</label>
            <select
              id="set-slot"
              value={settings.slotMinutes}
              onChange={(e) =>
                updateSettings({ slotMinutes: Number(e.target.value) as 15 | 30 | 60 })
              }
            >
              <option value={15}>15 {t('common.minUnit')}</option>
              <option value={30}>30 {t('common.minUnit')}</option>
              <option value={60}>60 {t('common.minUnit')}</option>
            </select>
            <p className="muted">{t('settings.slotMinutesHint')}</p>
          </div>
          <div className="field">
            <label htmlFor="set-daystart">{t('settings.dayStart')}</label>
            <select
              id="set-daystart"
              value={settings.dayStartHour}
              onChange={(e) => updateSettings({ dayStartHour: Number(e.target.value) })}
            >
              {[0, 4, 5, 6, 7, 8, 9].map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="set-firstday">{t('settings.firstDay')}</label>
            <select
              id="set-firstday"
              value={settings.firstDayOfWeek}
              onChange={(e) => updateSettings({ firstDayOfWeek: Number(e.target.value) as 0 | 1 })}
            >
              <option value={1}>{t('settings.firstDay.monday')}</option>
              <option value={0}>{t('settings.firstDay.sunday')}</option>
            </select>
          </div>
        </section>

        <section className="card">
          <h2>{t('settings.data')}</h2>
          <p className="muted">{t('settings.dataHint')}</p>
          <div className="settings-actions">
            <button type="button" className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>
              {t('settings.import')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="visually-hidden"
              aria-label={t('settings.import')}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onImportFile(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              className="btn btn-ghost"
              title={t('settings.sampleHint')}
              onClick={() => {
                if (window.confirm(t('settings.sampleConfirm'))) void loadSampleWeek();
              }}
            >
              {t('settings.sample')}
            </button>
            <button type="button" className="btn btn-danger" onClick={eraseAll}>
              {t('settings.erase')}
            </button>
          </div>
          {message && (
            <p role="status" className="muted" style={{ marginTop: 10 }}>
              {message}
            </p>
          )}
        </section>

        <section className="card">
          <h2>{t('settings.about')}</h2>
          <p className="muted" style={{ marginTop: 8 }}>
            {t('settings.aboutText')}
          </p>
        </section>
      </div>

      {editing !== null && (
        <CategoryDialog
          category={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
