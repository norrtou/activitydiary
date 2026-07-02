/**
 * Insights view — occupational balance in pictures and numbers.
 * Charts are added in a dedicated pass (see components/charts/).
 */
import { useI18n } from '../i18n';

export function InsightsPage() {
  const { t } = useI18n();
  return (
    <>
      <header className="page-header">
        <h1>{t('insights.title')}</h1>
      </header>
      <p className="muted">{t('insights.noData')}</p>
    </>
  );
}
