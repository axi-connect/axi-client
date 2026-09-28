"use client";

import { useId } from "react";

import { cn } from "@/core/lib/utils";
import { pointAt, roadPath, stopFractions, type SampledRoad } from "@/modules/commercial/domain/route-map";

export interface DestinationStop {
  key: string;
  label: string;
  /** La cifra ya formateada («≈ 114»), o «—» si falta el ticket. */
  value: string;
}

const pct = (value: number, of: number) => `${String((value / of) * 100)}%`;
const CHIP = "inline-flex items-center rounded-full bg-background px-2.5 text-xs font-medium whitespace-nowrap shadow-[0_4px_14px_-6px_rgba(16,16,24,.35)] ring-1 ring-border tabular-nums";

/**
 * El mapa del destino (C3b, canvas 2): la carretera de hoy a la meta con las
 * paradas del camino al revés —conversaciones, contactados, citas,
 * cotizaciones, ventas— y sus cifras de la vista previa. La etiqueta del SVG
 * dice lo mismo en una frase. Mientras recalcula, se atenúa (sin silueta).
 */
export function DestinationMap({
  road,
  stops,
  startLabel,
  goalLabel,
  goalDay,
  busy = false,
  compact = false,
}: {
  road: SampledRoad;
  stops: readonly DestinationStop[];
  startLabel: string;
  goalLabel: string;
  goalDay: string;
  busy?: boolean;
  /** Estrecho: las paradas sin rótulo largo. */
  compact?: boolean;
}) {
  const patternId = useId();
  const { layout } = road;
  const d = roadPath(layout);
  const start = pointAt(road, 0);
  const goal = pointAt(road, 1);
  const at = stopFractions(stops.length).map((fraction) => pointAt(road, fraction));
  const label = [`De ${startLabel.toLowerCase()} a ${goalLabel}, ${goalDay}`, ...stops.map((stop, i) => `parada ${String(i + 1)}: ${stop.value} ${stop.label.toLowerCase()}`)].join("; ");

  return (
    <div className={cn("absolute inset-0 transition-opacity", busy && "opacity-60")} aria-busy={busy || undefined}>
      <svg viewBox={`0 0 ${String(layout.width)} ${String(layout.height)}`} className="absolute inset-0 size-full" role="img" aria-label={label}>
        <defs>
          <pattern id={patternId} width="108" height="90" patternUnits="userSpaceOnUse">
            <rect x="8" y="8" width="92" height="74" rx="10" fill="var(--color-secondary)" />
          </pattern>
        </defs>
        <rect width={layout.width} height={layout.height} fill="var(--color-muted)" />
        <rect width={layout.width} height={layout.height} fill={`url(#${patternId})`} />
        <path d={d} fill="none" stroke="var(--color-background)" strokeWidth={18} strokeLinecap="round" />
        <path d={d} fill="none" stroke="var(--color-foreground)" strokeWidth={8} strokeLinecap="round" />
        <circle cx={start.x} cy={start.y} r={9} fill="var(--color-brand)" stroke="var(--color-background)" strokeWidth={4} />
        {at.map((point, i) => (
          <g key={stops[i].key}>
            <circle cx={point.x} cy={point.y} r={11} fill="var(--color-background)" stroke="var(--color-foreground)" strokeWidth={3} />
            <text x={point.x} y={point.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-foreground)">
              {i + 1}
            </text>
          </g>
        ))}
        <circle cx={goal.x} cy={goal.y} r={compact ? 15 : 20} fill="var(--color-foreground)" />
        <path
          d={`M ${String(goal.x - 5)} ${String(goal.y + 9)} V ${String(goal.y - 10)} H ${String(goal.x + 8)} L ${String(goal.x + 5)} ${String(goal.y - 6)} L ${String(goal.x + 8)} ${String(goal.y - 2)} H ${String(goal.x - 5)}`}
          fill="none"
          stroke="var(--color-background)"
          strokeWidth={2}
        />
      </svg>

      <span aria-hidden className="absolute w-max" style={{ left: pct(start.x, layout.width), top: pct(start.y, layout.height), transform: "translate(-20%, 18px)" }}>
        <span className={cn(CHIP, "h-7 gap-1.5")}>
          <span className="size-1.5 rounded-full bg-brand" />
          {startLabel}
        </span>
      </span>
      {at.map((point, i) => (
        <span
          key={stops[i].key}
          aria-hidden
          className="absolute w-max"
          style={{
            left: pct(point.x, layout.width),
            top: pct(point.y, layout.height),
            transform: i % 2 === 0 ? "translate(16px, 14px)" : "translate(calc(-100% - 16px), calc(-100% - 12px))",
          }}
        >
          <span className={cn(CHIP, "flex-col items-start rounded-2xl py-1.5", compact && "py-1")}>
            <b className={cn("font-heading leading-tight font-bold", compact ? "text-sm" : "text-lg")}>{stops[i].value}</b>
            {compact ? null : <span className="text-[11.5px] font-normal text-muted-foreground">{stops[i].label}</span>}
          </span>
        </span>
      ))}
      <span aria-hidden className="absolute w-max" style={{ left: pct(goal.x, layout.width), top: pct(goal.y, layout.height), transform: `translate(calc(-100% - ${compact ? "22px" : "30px"}), -50%)` }}>
        <span className={cn(CHIP, "h-8 gap-1.5 px-3.5")}>
          <b className="font-semibold">{goalLabel}</b>
          <span className="text-muted-foreground">{goalDay}</span>
        </span>
      </span>
    </div>
  );
}
