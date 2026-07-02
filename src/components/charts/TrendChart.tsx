/**
 * Single-series trend line for daily energy or mood averages.
 * One series → the card title names it, so no legend box is needed.
 */
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useI18n } from '../../i18n';
import { formatShortDate, formatWeekdayShort } from '../../lib/time';
import { axisTick, tooltipContentStyle } from './common';

interface Props {
  days: string[];
  values: Map<string, number>;
  /** Y domain, e.g. [-2, 2] for energy, [1, 5] for mood. */
  domain: [number, number];
  color: string;
  /** Draw a neutral zero line (energy). */
  zeroLine?: boolean;
  monthly?: boolean;
}

export function TrendChart({ days, values, domain, color, zeroLine, monthly }: Props) {
  const { locale } = useI18n();

  const data = days.map((day, i) => ({
    day,
    label: monthly
      ? i % 5 === 0
        ? formatShortDate(day, locale)
        : ''
      : formatWeekdayShort(day, locale),
    value: values.has(day) ? Number(values.get(day)!.toFixed(2)) : null,
  }));

  return (
    <div className="chart-box" style={{ height: 200 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
          <CartesianGrid stroke="var(--hairline)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: 'var(--hairline)' }}
            interval={0}
          />
          <YAxis
            domain={domain}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          {zeroLine && <ReferenceLine y={0} stroke="var(--ink-muted)" strokeDasharray="4 4" />}
          <Tooltip
            contentStyle={tooltipContentStyle}
            formatter={(value) => [Number(value).toLocaleString(locale)]}
            labelFormatter={(_, payload) => {
              const day = payload?.[0]?.payload?.day as string | undefined;
              return day ? formatShortDate(day, locale) : '';
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            connectNulls
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
