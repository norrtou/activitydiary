/**
 * Print-friendly activity report, opened outside the app chrome so the
 * browser's "Save as PDF" produces a clean document.
 */
import { useI18n } from '../i18n';

export function ReportPage() {
  const { t } = useI18n();
  return (
    <main style={{ padding: 24 }}>
      <h1>{t('report.title')}</h1>
    </main>
  );
}
