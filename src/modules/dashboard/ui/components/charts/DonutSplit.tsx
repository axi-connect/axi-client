"use client";

import { useReducedMotion } from "framer-motion";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { DATAVIZ_SEQUENCE, TOOLTIP_STYLE } from "./chart-theme";

export type DonutSlice = {
  key: string;
  label: string;
  value: number;
};

/**
 * Donut de reparto (p.ej. IA vs humano, etapas de contacto). Colores desde la
 * secuencia de dataviz. Altura fija; sin animación bajo reduced-motion.
 */
export function DonutSplit({
  slices,
  size = 140,
  centerLabel,
  centerValue,
}: {
  slices: DonutSlice[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const reduced = useReducedMotion();
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="label"
            innerRadius="66%"
            outerRadius="100%"
            paddingAngle={total > 0 ? 2 : 0}
            stroke="none"
            isAnimationActive={!reduced}
          >
            {slices.map((slice, index) => (
              <Cell
                key={slice.key}
                fill={DATAVIZ_SEQUENCE[index % DATAVIZ_SEQUENCE.length]}
              />
            ))}
          </Pie>
          <Tooltip {...TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel !== undefined || centerValue !== undefined) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue !== undefined && (
            <span className="text-lg font-semibold tabular-nums">{centerValue}</span>
          )}
          {centerLabel !== undefined && (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
