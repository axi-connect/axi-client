"use client";

import { useId } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_COLOR, CHART_COLORS, GRID_COLOR, TOOLTIP_STYLE } from "./chart-theme";

export type AreaSeries = {
  key: string;
  label: string;
  color?: string;
};

/**
 * Gráfico de área con relleno de gradiente de marca. Altura fija vía
 * `ResponsiveContainer` (sin scroll anidado). Anima solo bajo motion normal
 * (`prefers-reduced-motion` desactiva la animación de entrada).
 */
export function AreaTrend({
  data,
  series,
  xKey,
  formatX,
  formatY,
  height = 180,
}: {
  data: Array<Record<string, number | string>>;
  series: AreaSeries[];
  xKey: string;
  formatX?: (value: string) => string;
  formatY?: (value: number) => string;
  height?: number;
}) {
  const reduced = useReducedMotion();
  const gradientId = useId();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
        <defs>
          {series.map((entry, index) => (
            <linearGradient
              key={entry.key}
              id={`${gradientId}-${index}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor={entry.color ?? CHART_COLORS.brand}
                stopOpacity={0.35}
              />
              <stop
                offset="95%"
                stopColor={entry.color ?? CHART_COLORS.brand}
                stopOpacity={0}
              />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
        <XAxis
          dataKey={xKey}
          tickFormatter={formatX}
          tick={{ fontSize: 11, fill: AXIS_COLOR }}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          tick={{ fontSize: 11, fill: AXIS_COLOR }}
          tickLine={false}
          axisLine={false}
          width={32}
          allowDecimals={false}
        />
        <Tooltip
          {...TOOLTIP_STYLE}
          labelFormatter={(value) => (formatX ? formatX(String(value)) : String(value))}
          formatter={(value) => (formatY ? formatY(Number(value)) : String(value))}
        />
        {series.map((entry, index) => (
          <Area
            key={entry.key}
            type="monotone"
            dataKey={entry.key}
            name={entry.label}
            stroke={entry.color ?? CHART_COLORS.brand}
            strokeWidth={2}
            fill={`url(#${gradientId}-${index})`}
            isAnimationActive={!reduced}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
