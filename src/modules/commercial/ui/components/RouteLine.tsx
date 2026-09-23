"use client";

import { useId } from "react";

import { cn } from "@/core/lib/utils";
import type { WeekTick } from "@/modules/commercial/domain/weeks";
import { useEntrance } from "@/modules/commercial/ui/hooks/use-count-up";

interface RouteLineProps {
  /** Camino recorrido, 0–1. */
  done: number;
  /** Dónde deberías ir hoy, 0–1. Sin él no hay marcador (estado «aprendiendo»). */
  expected?: number | null;
  /** A dónde llegas si sigues así, 0–1+ (puede pasar de la meta). Sin él no hay prolongación. */
  projected?: number | null;
  /** Etiqueta de la prolongación («cierre ≈ $ 24,6 M · 82 %»). */
  projectedLabel?: string | null;
  /** Semanas hábiles del mes para las marcas S1…Sn (no en compacto). */
  weeks?: readonly WeekTick[];
  /** Franja del panel: 40 px de alto, sin semanas ni bandera. */
  compact?: boolean;
  className?: string;
}

const PAD_PCT = 1.2;
const track = (value: number): string => `${String(PAD_PCT + Math.min(1, Math.max(0, value)) * (100 - 2 * PAD_PCT))}%`;

/**
 * El instrumento del módulo: UNA línea horizontal (el mes). El tramo
 * recorrido va en el gradiente de marca, un marcador hueco dice dónde
 * deberías ir hoy y una prolongación punteada a dónde llegas si sigues así.
 * Nada de anillos ni tiles: progreso hacia una meta, no vanidad.
 *
 * Dibujado con coordenadas en % y sin `viewBox`: así los trazos, los círculos
 * y la bandera miden en píxeles a cualquier ancho (con `viewBox` +
 * `preserveAspectRatio="none"` el marcador se aplastaría). Las etiquetas
 * («hoy», S1…S5, la proyección) son HTML posicionado fuera del SVG por lo
 * mismo: el texto no escala con la caja.
 *
 * El gradiente lleva un `id` propio por instancia (`useId`): el panel y la
 * ruta pueden pintar dos líneas en la misma página y `url(#gradRoute)` con un
 * id repetido resuelve al primero que encuentre.
 *
 * Entrada con el resorte de marca (`spring.soft`, `useReducedMotion` la
 * anula): el tramo recorrido crece desde el origen una sola vez.
 */
export function RouteLine({ done, expected = null, projected = null, projectedLabel = null, weeks = [], compact = false, className }: RouteLineProps) {
  const gradientId = useId();
  const t = useEntrance();

  const doneClamped = Math.min(1, Math.max(0, done));
  const doneNow = doneClamped * t;
  const showProjection = projected !== null && projected > doneClamped;
  const projClamped = showProjection ? Math.min(1.04, projected) : null;

  const height = compact ? 28 : 40;
  const y = height / 2;
  const label = [
    `Ruta del mes: ${String(Math.round(doneClamped * 100))} % recorrido`,
    expected !== null ? `${String(Math.round(expected * 100))} % esperado a hoy` : null,
    showProjection ? `proyección ${String(Math.round(projected * 100))} %` : null,
  ]
    .filter((part) => part !== null)
    .join(", ");

  return (
    <div className={cn("relative w-full", compact ? "pt-0" : "pt-5 pb-6", className)}>
      {/* «hoy» encima del marcador hueco */}
      {!compact && expected !== null ? (
        <span
          aria-hidden
          className="absolute top-0 -translate-x-1/2 text-[10.5px] text-muted-foreground"
          style={{ left: track(expected) }}
        >
          hoy
        </span>
      ) : null}

      <svg width="100%" height={height} role="img" aria-label={label} className="block overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--color-brand)" />
            <stop offset="1" stopColor="var(--color-brand-2)" />
          </linearGradient>
        </defs>
        <line x1={track(0)} x2={track(1)} y1={y} y2={y} stroke="var(--color-secondary)" strokeWidth={compact ? 6 : 8} strokeLinecap="round" />
        {!compact
          ? weeks.slice(0, -1).map((week) => (
              <line
                key={week.label}
                x1={track(week.end_pct / 100)}
                x2={track(week.end_pct / 100)}
                y1={y + 11}
                y2={y + 16}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
            ))
          : null}
        {projClamped !== null ? (
          <line
            x1={track(doneNow)}
            x2={track(projClamped)}
            y1={y}
            y2={y}
            stroke="var(--color-muted-foreground)"
            strokeWidth={2}
            strokeDasharray="3 6"
            strokeLinecap="round"
          />
        ) : null}
        {doneNow > 0 ? (
          <line x1={track(0)} x2={track(doneNow)} y1={y} y2={y} stroke={`url(#${gradientId})`} strokeWidth={compact ? 6 : 8} strokeLinecap="round" />
        ) : null}
        {!compact ? (
          <path
            d={`M${String(100 - PAD_PCT)}% ${String(y - 20)} v20 M${String(100 - PAD_PCT)}% ${String(y - 20)} h10 l-3 4 3 4 h-10`}
            stroke="var(--color-foreground)"
            strokeWidth={1.6}
            fill="none"
            transform="translate(-1 0)"
          />
        ) : null}
        {expected !== null ? (
          <circle cx={track(expected)} cy={y} r={compact ? 5 : 6} fill="var(--color-background)" stroke="var(--color-foreground)" strokeWidth={2} />
        ) : null}
        {doneNow > 0 ? (
          <circle cx={track(doneNow)} cy={y} r={compact ? 5.5 : 7} fill="var(--color-brand)" stroke="var(--color-background)" strokeWidth={3} />
        ) : null}
      </svg>

      {/* Etiqueta de la proyección: a la derecha del final punteado; si no cabe, encima a la izquierda */}
      {!compact && showProjection && projectedLabel !== null ? (
        <span
          aria-hidden
          className={cn(
            "absolute text-[11px] font-medium text-foreground whitespace-nowrap",
            projected < 0.82 ? "top-1/2 -translate-y-1/2 pl-3" : "top-0 -translate-x-full pr-3",
          )}
          style={{ left: track(projected < 0.82 ? projClamped ?? 0 : Math.min(1, projected)) }}
        >
          {projectedLabel}
        </span>
      ) : null}

      {/* S1…S5 debajo de la línea */}
      {!compact
        ? weeks.map((week) => (
            <span
              key={week.label}
              aria-hidden
              className="absolute bottom-0 -translate-x-1/2 text-[10.5px] text-muted-foreground"
              style={{ left: track(week.mid_pct / 100) }}
            >
              {week.label}
            </span>
          ))
        : null}
    </div>
  );
}
