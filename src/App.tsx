/**
 * Application root: routing, language and theme wiring.
 * HashRouter is used deliberately — it needs no server-side fallback, which
 * makes deep links reliable on GitHub Pages.
 */
import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from './i18n';
import { Layout } from './components/Layout';
import { TodayPage } from './pages/TodayPage';
import { WeekPage } from './pages/WeekPage';
import { ExportPage } from './pages/ExportPage';
import { SettingsPage } from './pages/SettingsPage';
import { WelcomePage } from './pages/WelcomePage';

// Charts (Recharts) are heavy — split them out so the everyday views load fast.
const InsightsPage = lazy(() =>
  import('./pages/InsightsPage').then((m) => ({ default: m.InsightsPage })),
);
const ReportPage = lazy(() =>
  import('./pages/ReportPage').then((m) => ({ default: m.ReportPage })),
);

export default function App() {
  return (
    <LanguageProvider>
      <HashRouter>
        <Routes>
          {/* The welcome page IS the root — every visitor is met by it. */}
          <Route path="/" element={<WelcomePage />} />
          <Route element={<Layout />}>
            <Route path="today" element={<TodayPage />} />
            <Route path="day/:date" element={<TodayPage />} />
            <Route path="week" element={<WeekPage />} />
            <Route
              path="insights"
              element={
                <Suspense fallback={null}>
                  <InsightsPage />
                </Suspense>
              }
            />
            <Route path="export" element={<ExportPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          {/* Old links to the previous welcome address still work. */}
          <Route path="welcome" element={<Navigate to="/" replace />} />
          <Route
            path="report"
            element={
              <Suspense fallback={null}>
                <ReportPage />
              </Suspense>
            }
          />
        </Routes>
      </HashRouter>
    </LanguageProvider>
  );
}
