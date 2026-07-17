"use client";

import { useReducedMotion } from "framer-motion";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_COLOR, TOOLTIP_STYLE } from "@/modules/dashboard/ui/components/charts/chart-theme";

export type StackedRow = {
  key: string;
  label: string;
  low: number;
  medium: number;
  high: number;
};

/**
 * Barras horizontales apiladas por severidad (top de problemas). Severidades
 * con tokens de ESTADO (no la paleta dataviz de marca): leve=muted,
 * media=warning, alta=destructive. Clic en la barra filtra la tabla.
 */
export function BarStacked({
  data,
  height,
  onBarClick,
}: {
  data: StackedRow[];
  height?: number;
  onBarClick?: (key: string) => void;
}) {
  const reduced = useReducedMotion();
  const chartHeight = height ?? Math.max(data.length * 44, 120);

  const handleClick = onBarClick
    ? (entry: unknown) => {
        const key = (entry as { payload?: StackedRow }).payload?.key;
        if (key) onBarClick(key);
      }
    : undefined;

  const barProps = {
    stackId: "severity",
    isAnimationActive: !reduced,
    onClick: handleClick,
    cursor: onBarClick ? "pointer" : undefined,
  } as const;

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 8 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={168}
          tick={{ fontSize: 12, fill: AXIS_COLOR }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          {...TOOLTIP_STYLE}
          cursor={{ fill: "var(--color-accent)" }}
          formatter={(value, name) => [String(value), String(name)]}
        />
        <Bar {...barProps} dataKey="low" name="Leve" fill="var(--color-muted-foreground)" opacity={0.35} />
        <Bar {...barProps} dataKey="medium" name="Media" fill="var(--color-warning)" />
        <Bar
          {...barProps}
          dataKey="high"
          name="Alta"
          fill="var(--color-destructive)"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
