/**
 * Export view — PDF report, CSV and JSON backup.
 * Implementations are added in the export pass (lib/export.ts).
 */
import { useI18n } from '../i18n';

export function ExportPage() {
  const { t } = useI18n();
  return (
    <>
      <header className="page-header">
        <h1>{t('export.title')}</h1>
      </header>
      <p className="muted">{t('export.subtitle')}</p>
    </>
  );
}
