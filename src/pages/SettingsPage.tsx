/**
 * Settings view — language, appearance, categories and data management.
 */
import { useI18n } from '../i18n';

export function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  return (
    <>
      <header className="page-header">
        <h1>{t('settings.title')}</h1>
      </header>
      <section className="card">
        <h2>{t('settings.language')}</h2>
        <div className="chip-row" style={{ marginTop: 8 }}>
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
    </>
  );
}
