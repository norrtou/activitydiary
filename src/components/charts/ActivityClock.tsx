/**
 * The activity clock: 24 sectors around a circle, one per hour of the day.
 * Each sector is filled radially by the average share of that hour spent in
 * each category over the period — an at-a-glance picture of the daily rhythm.
 *
 * Custom SVG (no charting library does this shape). Each segment carries a
 * <title> for hover/AT, and the parent card provides the legend + table.
 */
import { useI18n } from '../../i18n';
import { categoryName } from '../../lib/categoryName';
import { swatchColor } from '../../lib/palette';
import { minutesToHHMM } from '../../lib/time';
import type { Category } from '../../lib/types';

const CX = 120;
const CY = 120;
const R_INNER = 44;
const R_OUTER = 102;
const GAP_DEG = 1.6;

function polar(r: number, angleDeg: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

/** SVG path for an annular sector between radii r0<r1 and angles a0<a1 (degrees). */
function annularSector(r0: number, r1: number, a0: number, a1: number): string {
  const [x0o, y0o] = polar(r1, a0);
  const [x1o, y1o] = polar(r1, a1);
  const [x1i, y1i] = polar(r0, a1);
  const [x0i, y0i] = polar(r0, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return [
    `M ${x0o.toFixed(2)} ${y0o.toFixed(2)}`,
    `A ${r1} ${r1} 0 ${large} 1 ${x1o.toFixed(2)} ${y1o.toFixed(2)}`,
    `L ${x1i.toFixed(2)} ${y1i.toFixed(2)}`,
    `A ${r0} ${r0} 0 ${large} 0 ${x0i.toFixed(2)} ${y0i.toFixed(2)}`,
    'Z',
  ].join(' ');
}

interface Props {
  /** hour -> categoryId -> average fraction of that hour (0–1). */
  hourly: Map<number, Map<number, number>>;
  categories: Category[];
  categoryMap: Map<number, Category>;
  mode: 'light' | 'dark';
}

export function ActivityClock({ hourly, categories, categoryMap, mode }: Props) {
  const { t } = useI18n();

  return (
    <div className="chart-box clock-box">
      <svg viewBox="0 0 240 240" role="img" aria-label={t('insights.clockHint')}>
        {/* Background track per hour */}
        {Array.from({ length: 24 }, (_, h) => {
          const a0 = h * 15 + GAP_DEG / 2;
          const a1 = (h + 1) * 15 - GAP_DEG / 2;
          return (
            <path
              key={`bg-${h}`}
              d={annularSector(R_INNER, R_OUTER, a0, a1)}
              fill="var(--page)"
            />
          );
        })}

        {/* Category fills, stacked outwards in category order */}
        {Array.from({ length: 24 }, (_, h) => {
          const fractions = hourly.get(h);
          if (!fractions) return null;
          const a0 = h * 15 + GAP_DEG / 2;
          const a1 = (h + 1) * 15 - GAP_DEG / 2;
          let r = R_INNER;
          return categories.map((cat) => {
            const f = fractions.get(cat.id!) ?? 0;
            if (f <= 0.005) return null;
            const r1 = Math.min(r + f * (R_OUTER - R_INNER), R_OUTER);
            const path = (
              <path
                key={`${h}-${cat.id}`}
                d={annularSector(r, r1, a0, a1)}
                fill={swatchColor(cat.swatchId, mode)}
                stroke="var(--surface)"
                strokeWidth="0.8"
              >
                <title>
                  {`${minutesToHHMM(h * 60)}–${minutesToHHMM(((h + 1) % 24) * 60)} · ${categoryName(
                    categoryMap.get(cat.id!)!,
                    t,
                  )} · ${Math.round(f * 60)} ${t('common.minUnit')}`}
                </title>
              </path>
            );
            r = r1;
            return path;
          });
        })}

        {/* Hour labels */}
        {[0, 6, 12, 18].map((h) => {
          const [x, y] = polar(R_OUTER + 12, h * 15 + 7.5 - 7.5);
          return (
            <text
              key={h}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fill="var(--ink-muted)"
            >
              {String(h).padStart(2, '0')}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
