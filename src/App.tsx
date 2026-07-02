/**
 * Application root: routing, language and theme wiring.
 * HashRouter is used deliberately — it needs no server-side fallback, which
 * makes deep links reliable on GitHub Pages.
 */
import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from './i18n';
import { resolveTheme, useSettings } from './lib/settings';
import { Layout } from './components/Layout';
import { TodayPage } from './pages/TodayPage';
import { WeekPage } from './pages/WeekPage';
import { InsightsPage } from './pages/InsightsPage';
import { ExportPage } from './pages/ExportPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReportPage } from './pages/ReportPage';

/** Applies the chosen theme to <html data-theme> and follows OS changes. */
function ThemeApplier() {
  const { theme } = useSettings();

  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(theme);
    };
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  return null;
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeApplier />
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<TodayPage />} />
            <Route path="day/:date" element={<TodayPage />} />
            <Route path="week" element={<WeekPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="export" element={<ExportPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          {/* The report opens without the app chrome so it prints cleanly. */}
          <Route path="report" element={<ReportPage />} />
        </Routes>
      </HashRouter>
    </LanguageProvider>
  );
}
