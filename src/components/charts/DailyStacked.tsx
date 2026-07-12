/**
 * Day-by-day stacked bars: hours per category for each day of the period.
 * Stacked segments are separated by a 2px surface stroke; identity comes
 * from the shared legend.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useI18n } from '../../i18n';
import { categoryName } from '../../lib/categoryName';
import { swatchColor } from '../../lib/palette';
import { formatWeekdayShort, formatShortDate } from '../../lib/time';
import type { Category } from '../../lib/types';
import { axisTick, hoursLabel, tooltipContentStyle } from './common';

interface Props {
  days: string[];
  perDay: Map<string, Map<number, number>>;
  categories: Category[];
  /** Compact tick labels (dates instead of weekdays) for month view. */
  monthly?: boolean;
  /** Chart height in px (defaults to the Insights card size). */
  height?: number;
}

export function DailyStacked({ days, perDay, categories, monthly, height = 260 }: Props) {
  const { t, locale } = useI18n();

  const data = days.map((day, i) => {
    const row: Record<string, number | string> = {
      day,
      label: monthly
        ? i % 5 === 0
          ? formatShortDate(day, locale)
          : ''
        : formatWeekdayShort(day, locale),
    };
    const cats = perDay.get(day);
    for (const cat of categories) {
      const min = cats?.get(cat.id!) ?? 0;
      if (min > 0) row[`c${cat.id}`] = min / 60;
    }
    return row;
  });

  const used = categories.filter((cat) => data.some((row) => row[`c${cat.id}`] != null));

  return (
    <div className="chart-box" style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="var(--hairline)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: 'var(--hairline)' }}
            interval={0}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            domain={[0, 24]}
            ticks={[0, 6, 12, 18, 24]}
          />
          <Tooltip
            contentStyle={tooltipContentStyle}
            cursor={{ fill: 'var(--accent-soft)' }}
            formatter={(value, name) => [
              hoursLabel(Number(value) * 60, locale, t('common.hourUnit')),
              String(name),
            ]}
            labelFormatter={(_, payload) => {
              const day = payload?.[0]?.payload?.day as string | undefined;
              return day ? formatShortDate(day, locale) : '';
            }}
          />
          {used.map((cat) => (
            <Bar
              key={cat.id}
              dataKey={`c${cat.id}` as string}
              name={categoryName(cat, t)}
              stackId="day"
              fill={swatchColor(cat.swatchId)}
              stroke="var(--surface)"
              strokeWidth={1}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
