/**
 * Welcome / start page — rendered at the root, so it is the page every
 * visitor is met by. Explains what the app is for and who it is for
 * (occupational therapy), lets the visitor pick language right away, and
 * leads into the diary at /today. Returning visitors get a single
 * "Open the diary" button instead of the first-time actions.
 */
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { hasSeenWelcome, markWelcomeSeen } from '../lib/settings';
import { loadSampleWeek } from '../lib/sampleData';
import { IconExport, IconInsights, IconLock, IconToday } from '../components/icons';

const logoMarkUrl = `${import.meta.env.BASE_URL}adlogo-mark.webp`;

export function WelcomePage() {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const returning = hasSeenWelcome();

  const start = () => {
    markWelcomeSeen();
    navigate('/today');
  };

  const startWithSample = async () => {
    if (!window.confirm(t('settings.sampleConfirm'))) return;
    await loadSampleWeek();
    markWelcomeSeen();
    navigate('/today');
  };

  const features = [
    { icon: <IconToday />, title: t('welcome.f1.title'), text: t('welcome.f1.text') },
    { icon: <IconInsights />, title: t('welcome.f2.title'), text: t('welcome.f2.text') },
    { icon: <IconExport />, title: t('welcome.f3.title'), text: t('welcome.f3.text') },
    { icon: <IconLock />, title: t('welcome.f4.title'), text: t('welcome.f4.text') },
  ];

  return (
    <main className="welcome">
      <fieldset className="chip-group welcome-lang">
        <legend className="visually-hidden">{t('settings.language')}</legend>
        <div className="chip-row">
          <label className="chip chip-small">
            <input type="radio" name="lang" checked={lang === 'sv'} onChange={() => setLang('sv')} />
            <span>Svenska</span>
          </label>
          <label className="chip chip-small">
            <input type="radio" name="lang" checked={lang === 'en'} onChange={() => setLang('en')} />
            <span>English</span>
          </label>
        </div>
      </fieldset>

      <header className="welcome-hero">
        <div className="welcome-logo">
          <img src={logoMarkUrl} alt={t('app.logoAlt')} width={640} height={388} />
        </div>
        <h1>{t('app.name')}</h1>
        <p className="welcome-tagline">{t('app.tagline')}</p>
        <p className="welcome-lead">{t('welcome.lead')}</p>
        <div className="welcome-cta">
          <button type="button" className="btn btn-primary btn-lg" onClick={start}>
            {returning ? t('welcome.open') : t('welcome.cta')}
          </button>
          {!returning && (
            <button
              type="button"
              className="btn btn-ghost btn-lg"
              onClick={() => void startWithSample()}
            >
              {t('settings.sample')}
            </button>
          )}
        </div>
      </header>

      <section className="welcome-features" aria-label={t('welcome.featuresLabel')}>
        {features.map((f) => (
          <div key={f.title} className="card welcome-feature">
            <span className="welcome-feature-icon" aria-hidden>
              {f.icon}
            </span>
            <h2>{f.title}</h2>
            <p>{f.text}</p>
          </div>
        ))}
      </section>

      <section className="card welcome-ot">
        <h2>{t('welcome.ot.title')}</h2>
        <p>{t('welcome.ot.text')}</p>
      </section>

      <section className="welcome-more">
        <h2>{t('settings.moreTitle')}</h2>
        <a className="project-link" href="https://anatomiquiz.se" target="_blank" rel="noopener">
          <span className="project-link-name">Anatomiquiz</span>
          <span className="project-link-desc">{t('settings.anatomiquizText')}</span>
        </a>
      </section>

      <p className="muted welcome-footer">{t('welcome.footer')}</p>
    </main>
  );
}
