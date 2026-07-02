/**
 * The activity clock: a 24-hour dial (midnight at the top, noon at the
 * bottom) where each hour sector is colored by the category you MOST OFTEN
 * did at that hour over the period. A solid fill means the hour usually
 * belongs to that category; a pale wash means only part of the time. The
 * full per-hour mix lives in each sector's tooltip and the legend + numbers
 * table carry identity, so color never works alone.
 *
 * (An earlier version stacked every category radially inside each hour —
 * accurate but unreadable. One color per hour is the version people get.)
 */
import { useI18n } from '../../i18n';
import { categoryName } from '../../lib/categoryName';
import { swatchColor, swatchWash } from '../../lib/palette';
import { minutesToHHMM } from '../../lib/time';
import type { Category } from '../../lib/types';

const CX = 130;
const CY = 130;
const R_INNER = 52;
const R_OUTER = 104;
const R_LABEL = 117;
const GAP_DEG = 1.6;
/** Hours with less than this average registered share stay empty. */
const MIN_SHARE = 0.15;
/** The dominant category renders solid from this share, washed below it. */
const SOLID_SHARE = 0.5;

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
      <svg viewBox="0 0 260 260" role="img" aria-label={t('insights.clockHint')}>
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

        {/* One sector per hour, colored by the hour's most common category */}
        {Array.from({ length: 24 }, (_, h) => {
          const fractions = hourly.get(h);
          if (!fractions) return null;
          const mix = categories
            .map((cat) => ({ cat, f: fractions.get(cat.id!) ?? 0 }))
            .filter(({ f }) => f > 0.005)
            .sort((a, b) => b.f - a.f);
          const top = mix[0];
          if (!top || top.f < MIN_SHARE) return null;
          const a0 = h * 15 + GAP_DEG / 2;
          const a1 = (h + 1) * 15 - GAP_DEG / 2;
          const solid = top.f >= SOLID_SHARE;
          const detail = mix
            .map(
              ({ cat, f }) =>
                `${categoryName(categoryMap.get(cat.id!)!, t)} ${Math.round(f * 60)} ${t('common.minUnit')}`,
            )
            .join(', ');
          return (
            <path
              key={`hour-${h}`}
              d={annularSector(R_INNER, R_OUTER, a0, a1)}
              fill={
                solid ? swatchColor(top.cat.swatchId, mode) : swatchWash(top.cat.swatchId, mode)
              }
            >
              <title>
                {`${minutesToHHMM(h * 60)}–${minutesToHHMM(((h + 1) % 24) * 60)}: ${detail}`}
              </title>
            </path>
          );
        })}

        {/* Hour labels every 3 hours, plus night/day markers at 00 and 12 */}
        {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => {
          const [x, y] = polar(R_LABEL, h * 15);
          return (
            <text
              key={h}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="11"
              fill="var(--ink-muted)"
            >
              {String(h).padStart(2, '0')}
            </text>
          );
        })}
        <text x={CX} y={CY - 32} textAnchor="middle" dominantBaseline="middle" fontSize="15" aria-hidden>
          🌙
        </text>
        <text x={CX} y={CY + 34} textAnchor="middle" dominantBaseline="middle" fontSize="15" aria-hidden>
          ☀️
        </text>
      </svg>
    </div>
  );
}
