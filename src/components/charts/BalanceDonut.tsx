/**
 * Occupational balance donut: share of registered time per category, with
 * the total in the centre and the hour count written next to each slice big
 * enough to label (≥5%) — the chart must be readable without chart literacy.
 * Identity is carried by the legend rendered by the parent card (never color
 * alone) and exact values live in the numbers table.
 */
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useI18n } from '../../i18n';
import { categoryName } from '../../lib/categoryName';
import { swatchColor } from '../../lib/palette';
import type { CategoryTotal } from '../../lib/stats';
import type { Category } from '../../lib/types';
import { hoursLabel, tooltipContentStyle } from './common';

interface Props {
  totals: CategoryTotal[];
  categories: Map<number, Category>;
  /** Chart height in px (defaults to the Insights card size). */
  height?: number;
}

const RAD = Math.PI / 180;

export function BalanceDonut({ totals, categories, height = 240 }: Props) {
  const { t, locale } = useI18n();
  const hourUnit = t('common.hourUnit');
  const data = totals
    .filter((tot) => tot.minutes > 0)
    .map((tot) => {
      const cat = categories.get(tot.categoryId);
      return {
        name: cat ? categoryName(cat, t) : '',
        value: tot.minutes,
        color: cat ? swatchColor(cat.swatchId) : '#888',
        share: tot.share,
      };
    });
  const totalMin = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="52%"
            outerRadius="76%"
            stroke="var(--surface)"
            strokeWidth={2}
            isAnimationActive={false}
            labelLine={false}
            label={({ cx, cy, midAngle, outerRadius, value, percent }) => {
              // Hours beside each slice — small slices stay unlabeled
              // (tooltip + numbers table carry them).
              if ((percent ?? 0) < 0.05) return <g />;
              const r = Number(outerRadius) + 12;
              const x = Number(cx) + r * Math.cos(-Number(midAngle) * RAD);
              const y = Number(cy) + r * Math.sin(-Number(midAngle) * RAD);
              return (
                <text
                  x={x}
                  y={y}
                  textAnchor={x > Number(cx) ? 'start' : 'end'}
                  dominantBaseline="central"
                  fontSize={11}
                  fontWeight={550}
                  fill="var(--ink-secondary)"
                >
                  {hoursLabel(Number(value), locale, hourUnit)}
                </text>
              );
            }}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipContentStyle}
            formatter={(value, _name, item) => {
              const share = (item as { payload?: { share?: number } }).payload?.share ?? 0;
              return [
                `${hoursLabel(Number(value), locale, t('common.hourUnit'))} · ${Math.round(share * 100)}%`,
              ];
            }}
          />
          <text
            x="50%"
            y="47%"
            textAnchor="middle"
            fill="var(--ink)"
            fontSize="22"
            fontWeight="650"
          >
            {(totalMin / 60).toLocaleString(locale, { maximumFractionDigits: 0 })}
          </text>
          <text x="50%" y="57%" textAnchor="middle" fill="var(--ink-muted)" fontSize="12">
            {t('common.hours').toLowerCase()}
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
