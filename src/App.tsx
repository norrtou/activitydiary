/**
 * Application root: routing, language and theme wiring.
 * HashRouter is used deliberately — it needs no server-side fallback, which
 * makes deep links reliable on GitHub Pages.
 */
import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from './i18n';
import { hasSeenWelcome } from './lib/settings';
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

/** First visit lands on the welcome page; after "Get started" the index is Today. */
function HomeGate() {
  if (!hasSeenWelcome()) return <Navigate to="/welcome" replace />;
  return <TodayPage />;
}

export default function App() {
  return (
    <LanguageProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomeGate />} />
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
          {/* Welcome and report render without the app chrome. */}
          <Route path="welcome" element={<WelcomePage />} />
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
