/**
 * App shell: bottom tab bar on mobile, sidebar on desktop.
 * The five destinations are the whole information architecture — everything
 * advanced lives inside Settings.
 */
import { NavLink, Outlet } from 'react-router-dom';
import { useT } from '../i18n';
import {
  IconExport,
  IconInsights,
  IconSettings,
  IconToday,
  IconWeek,
} from './icons';

export function Layout() {
  const t = useT();

  const items = [
    { to: '/', label: t('nav.today'), icon: <IconToday /> },
    { to: '/week', label: t('nav.week'), icon: <IconWeek /> },
    { to: '/insights', label: t('nav.insights'), icon: <IconInsights /> },
    { to: '/export', label: t('nav.export'), icon: <IconExport /> },
    { to: '/settings', label: t('nav.settings'), icon: <IconSettings /> },
  ];

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        {t('a11y.skipToContent')}
      </a>
      <nav className="app-nav" aria-label={t('nav.main')}>
        <div className="app-brand" aria-hidden>
          <span>📔</span>
          <span>{t('app.name')}</span>
        </div>
        <ul>
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main className="app-main" id="main">
        <Outlet />
      </main>
    </div>
  );
}
