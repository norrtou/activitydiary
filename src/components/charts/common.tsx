/**
 * Shared chart pieces: the category legend (color + icon + name — identity is
 * never color-alone) and tooltip styling shared by all Recharts charts.
 */
import type { CSSProperties } from 'react';
import { useI18n } from '../../i18n';
import { categoryName } from '../../lib/categoryName';
import { swatchColor } from '../../lib/palette';
import type { Category } from '../../lib/types';

export const tooltipContentStyle: CSSProperties = {
  background: 'var(--surface-raised)',
  border: '1px solid var(--hairline)',
  borderRadius: 12,
  boxShadow: 'var(--shadow-card)',
  fontSize: '0.8rem',
  color: 'var(--ink)',
};

export const axisTick = { fill: 'var(--ink-muted)', fontSize: 11 } as const;

/** '7,5 tim' / '7.5 h' style duration label. */
export function hoursLabel(minutes: number, locale: string, hourUnit: string): string {
  return `${(minutes / 60).toLocaleString(locale, { maximumFractionDigits: 1 })} ${hourUnit}`;
}

export function ChartLegend({
  categories,
  mode,
}: {
  categories: Category[];
  mode: 'light' | 'dark';
}) {
  const { t } = useI18n();
  return (
    <ul className="chart-legend">
      {categories.map((cat) => (
        <li key={cat.id}>
          <span
            className="legend-dot"
            style={{ background: swatchColor(cat.swatchId, mode) }}
            aria-hidden
          />
          <span aria-hidden>{cat.icon}</span> {categoryName(cat, t)}
        </li>
      ))}
    </ul>
  );
}
