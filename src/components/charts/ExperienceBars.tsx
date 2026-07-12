/**
 * How activities feel: one diverging bar per category around a neutral
 * center line. Used for energy (center 0, −2…+2: takes ↔ gives energy) and
 * mood (center 3, 1…5: felt bad ↔ felt good). The position relative to the
 * center carries the message, the category color carries identity, and every
 * bar prints its value — occupational imbalance should be visible at a
 * glance, without chart literacy.
 */
import { useI18n } from '../../i18n';
import { categoryName } from '../../lib/categoryName';
import { swatchColor } from '../../lib/palette';
import type { CategoryRating } from '../../lib/stats';
import type { Category } from '../../lib/types';

interface Props {
  ratings: CategoryRating[];
  categoryMap: Map<number, Category>;
  /** Neutral value the bars diverge from (energy: 0, mood: 3). */
  center: number;
  /** Distance from center to each end of the scale (2 for both ratings). */
  range: number;
  /** Plain-language labels for the two directions. */
  negLabel: string;
  posLabel: string;
  /** Show a +/− sign on the value (energy) or the plain value (mood). */
  signed?: boolean;
}

export function ExperienceBars({
  ratings,
  categoryMap,
  center,
  range,
  negLabel,
  posLabel,
  signed,
}: Props) {
  const { t, locale } = useI18n();

  const format = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
    signDisplay: signed ? 'exceptZero' : 'auto',
  });

  const rows = [...ratings].sort((a, b) => b.avg - a.avg);

  return (
    <div className="xp">
      {rows.map((r) => {
        const cat = categoryMap.get(r.categoryId);
        if (!cat) return null;
        const frac = Math.max(-1, Math.min(1, (r.avg - center) / range));
        const positive = frac >= 0;
        return (
          <div key={r.categoryId} className="xp-row">
            <span className="xp-name">
              <span
                className="legend-dot"
                style={{ background: swatchColor(cat.swatchId) }}
                aria-hidden
              />
              <span className="xp-name-text">{categoryName(cat, t)}</span>
            </span>
            <span className="xp-track">
              <span className="xp-center" aria-hidden />
              <span
                className="xp-fill"
                style={{
                  background: swatchColor(cat.swatchId),
                  width: `${Math.abs(frac) * 50}%`,
                  ...(positive ? { left: '50%' } : { right: '50%' }),
                }}
                aria-hidden
              />
            </span>
            <span className="xp-val">{format.format(r.avg)}</span>
          </div>
        );
      })}
      <div className="xp-row" aria-hidden>
        <span />
        <span className="xp-axis">
          <span>← {negLabel}</span>
          <span>{posLabel} →</span>
        </span>
        <span />
      </div>
    </div>
  );
}
