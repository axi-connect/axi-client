"use client";

import { useId } from "react";

import { cn } from "@/core/lib/utils";
import type { WeekTick } from "@/modules/commercial/domain/weeks";
import { useElementWidth } from "@/modules/commercial/ui/hooks/use-element-width";
import { useEntrance } from "@/modules/commercial/ui/hooks/use-entrance";

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
  /**
   * La marca de hoy SOBRE la línea («Hoy · mié 23», la ruta del mes). Con ella
   * todas las semanas se ven y la de hoy se resalta; sin ella (el Panel), «hoy»
   * va debajo y su semana le cede el sitio.
   */
  todayLabel?: string | null;
  /** «Meta · $ 30 M» arriba a la derecha, en vez de la bandera. */
  targetLabel?: string | null;
  /** Franja del panel: 28 px de alto, sin semanas ni bandera. */
  compact?: boolean;
  /**
   * Las cifras, ya formateadas, para la etiqueta accesible: el lector de
   * pantalla oye «$ 18,9 M de $ 30.000.000» y no solo porcentajes. La
   * proyección, con su importe («$ 24,6 M · 82 %»).
   */
  figures?: { actual: string; target: string; projected?: string | null };
  /**
   * Progreso de entrada 0–1 aportado por el padre (el hero comparte un solo
   * motor con la cifra grande). Sin él la línea anima por su cuenta.
   */
  progress?: number;
  className?: string;
}

const PAD_PCT = 1.2;

/**
 * Distancia mínima (en % de la línea) entre «hoy» y la etiqueta de otra
 * semana: una semana corta (agosto de 2026 acaba con S6 = lunes 31) deja su
 * etiqueta pegada a «hoy» y a 375 px se montan (V7).
 */
export const TODAY_LABEL_CLEARANCE_PCT = 6;

/** Cerca de un extremo (en fracción de la línea), la marca «Hoy · …» se ancla a ese lado. */
const TODAY_EDGE = 0.12;
/**
 * Lo que ocupan, en píxeles, media marca «Hoy · mié 23» más el texto «Meta ·
 * $ 30 M» y un respiro: si «hoy» cae más cerca que esto del final, el texto
 * de la meta cede su sitio. En píxeles y no en %: a 390 px el 30 % de la línea
 * es poco y a 1040 px sobra.
 */
export const TARGET_CLEARANCE_PX = 150;
/** Sin medida todavía (primer render, jsdom) se supone la línea del escritorio. */
const FALLBACK_WIDTH_PX = 1040;



function crowdsToday(week: WeekTick, expected: number | null): boolean {
  return expected !== null && Math.abs(week.mid_pct - expected * 100) < TODAY_LABEL_CLEARANCE_PCT;
}

/** ¿Cae «hoy» (0–1) en esta semana? El borde final cuenta como de la semana. */
function isWeekOf(week: WeekTick, at: number): boolean {
  const pct = at * 100;
  return pct >= week.start_pct && pct <= week.end_pct;
}

/**
 * La pista (lo que falta del mes) mezcla el texto con el fondo al 50 %: ≥ 3:1
 * contra el fondo en claro (3,41:1) y en oscuro (4,71:1), el mínimo AA de un
 * elemento gráfico (WCAG 1.4.11). El 6 % de `--color-secondary` daba 1,1:1 y
 * el 35 % sugerido, 2,22:1 en claro. Lo fija `RouteLine.test.tsx` leyendo los
 * tokens de `globals.css`.
 */
export const ROUTE_TRACK_MIX_PCT = 50;
const TRACK_COLOR = `color-mix(in srgb, var(--foreground) ${String(ROUTE_TRACK_MIX_PCT)}%, var(--background))`;
/** El atraso: coral de marca apagado sobre la pista. Es refuerzo; la cifra lo dice en la franja de abajo. */
const GAP_COLOR = "color-mix(in srgb, var(--color-brand) 30%, var(--background))";
/** Hasta dónde puede asomar la proyección más allá de la bandera (1 = la meta). */
const PROJECTION_MAX = 1.04;
const track = (value: number, max = 1): string => `${String(PAD_PCT + Math.min(max, Math.max(0, value)) * (100 - 2 * PAD_PCT))}%`;

/**
 * El instrumento del módulo: UNA línea horizontal (el mes). El tramo
 * recorrido va en el gradiente de marca y acaba en un punto con anillo; una
 * raya que atraviesa la pista dice dónde deberías ir hoy (el atraso hasta
 * ella, en coral apagado) y una prolongación punteada con su anillo, a dónde
 * llegas si sigues así.
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
 * anula): el tramo recorrido crece desde el origen una sola vez. La bandera
 * de la meta es HTML: un `%` dentro de `d=` de un `<path>` no es SVG válido.
 * La prolongación punteada puede pasar la bandera hasta un 4 % (`overflow:
 * visible`): «a donde llegas si sigues así» se ve más allá de la meta.
 */
export function RouteLine(props: RouteLineProps) {
  // Un solo motor por pantalla: si el padre trae el progreso, aquí no se
  // arranca otro. Los hooks no pueden ser condicionales, así que el motor
  // propio vive en un componente aparte que solo se monta sin `progress`.
  if (props.progress === undefined) return <SelfDrivenRouteLine {...props} />;
  return <RouteLineBase {...props} progress={props.progress} />;
}

function SelfDrivenRouteLine(props: RouteLineProps) {
  const t = useEntrance();
  return <RouteLineBase {...props} progress={t} />;
}

function RouteLineBase({
  done,
  expected = null,
  projected = null,
  projectedLabel = null,
  weeks = [],
  todayLabel = null,
  targetLabel = null,
  compact = false,
  figures,
  progress: t,
  className,
}: RouteLineProps & { progress: number }) {
  const gradientId = useId();
  const [boxRef, width] = useElementWidth<HTMLDivElement>();

  const doneClamped = Math.min(1, Math.max(0, done));
  const doneNow = doneClamped * t;
  const showProjection = projected !== null && projected > doneClamped;
  const projClamped = showProjection ? Math.min(PROJECTION_MAX, projected) : null;

  // Solo UNA semana cede su etiqueta, aunque «hoy» caiga justo en un borde.
  const todayWeek = expected === null ? -1 : weeks.findIndex((week) => isWeekOf(week, expected));
  // La marca de hoy se ancla al borde cuando cae cerca de él (no se sale de la
  // tarjeta), y el texto de la meta cede si la marca de hoy se le acerca.
  const todayAnchor = expected === null ? "center" : expected < TODAY_EDGE ? "start" : expected > 1 - TODAY_EDGE ? "end" : "center";
  const lineWidth = width > 0 ? width : FALLBACK_WIDTH_PX;
  const crowdsTarget = todayLabel !== null && expected !== null && (1 - expected) * lineWidth < TARGET_CLEARANCE_PX;
  const height = compact ? 28 : 40;
  const y = height / 2;
  const label = [
    figures === undefined
      ? `Ruta del mes: ${String(Math.round(doneClamped * 100))} % recorrido`
      : `Ruta del mes: ${figures.actual} de ${figures.target}, ${String(Math.round(doneClamped * 100))} % recorrido`,
    expected !== null ? `${String(Math.round(expected * 100))} % esperado a hoy` : null,
    showProjection
      ? figures?.projected != null
        ? `proyección ${figures.projected}`
        : `proyección ${String(Math.round(projected * 100))} %`
      : null,
  ]
    .filter((part) => part !== null)
    .join(", ");

  return (
    <div ref={boxRef} className={cn("relative w-full", compact ? "pt-0" : "pt-5 pb-6", className)}>

      <svg width="100%" height={height} role="img" aria-label={label} className="block overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--color-brand)" />
            <stop offset="1" stopColor="var(--color-brand-2)" />
          </linearGradient>
        </defs>
        <line x1={track(0)} x2={track(1)} y1={y} y2={y} stroke={TRACK_COLOR} strokeWidth={compact ? 6 : 8} strokeLinecap="round" />
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
        {/* El atraso: de lo recorrido a donde deberías ir hoy, en coral suave. Solo si vas por detrás. */}
        {expected !== null && expected > doneClamped ? (
          <line x1={track(doneNow)} x2={track(expected)} y1={y} y2={y} stroke={GAP_COLOR} strokeWidth={compact ? 6 : 8} />
        ) : null}
        {doneNow > 0 ? (
          <line x1={track(0)} x2={track(doneNow)} y1={y} y2={y} stroke={`url(#${gradientId})`} strokeWidth={compact ? 6 : 8} strokeLinecap="round" />
        ) : null}
        {projClamped !== null ? (
          <line
            x1={track(doneNow)}
            x2={track(projClamped, PROJECTION_MAX)}
            y1={y}
            y2={y}
            // Sobre la pista al 50 %: el trazo va en el color del texto para
            // seguir leyéndose (el gris apagado desaparecía encima).
            stroke="var(--color-foreground)"
            strokeWidth={1.5}
            strokeDasharray="1.5 4.5"
            strokeLinecap="round"
          />
        ) : null}
        {projClamped !== null ? (
          <circle cx={track(projClamped, PROJECTION_MAX)} cy={y} r={3.5} fill="var(--color-background)" stroke="var(--color-foreground)" strokeWidth={1.5} />
        ) : null}
        {/* Dónde deberías ir hoy: una raya que atraviesa la pista. */}
        {expected !== null ? (
          <line
            data-slot="route-today"
            x1={track(expected)}
            x2={track(expected)}
            y1={y - (compact ? 8 : 11)}
            y2={y + (compact ? 8 : 11)}
            stroke="var(--color-foreground)"
            strokeWidth={2}
            strokeLinecap="round"
          />
        ) : null}
        {doneNow > 0 ? (
          <circle cx={track(doneNow)} cy={y} r={compact ? 5 : 6.5} fill="var(--color-background)" stroke="var(--color-brand)" strokeWidth={3} />
        ) : null}
      </svg>

      {/* La bandera de la meta, al final de la línea (o su texto, arriba a la derecha) */}
      {!compact && targetLabel !== null && !crowdsTarget ? (
        <span aria-hidden data-slot="route-target" className="absolute top-0 right-0 text-[11.5px] leading-4 whitespace-nowrap text-muted-foreground">
          {targetLabel}
        </span>
      ) : null}
      {!compact && targetLabel === null ? (
        <span
          aria-hidden
          className="absolute -translate-x-full text-foreground"
          style={{ left: `calc(${track(1)} + 6px)`, top: 0 }}
        >
          <svg width="13" height="22" viewBox="0 0 13 22" className="block">
            <path d="M1 0v22M1 0h11l-3 4 3 4H1" stroke="currentColor" strokeWidth="1.6" fill="none" />
          </svg>
        </span>
      ) : null}

      {/* Etiqueta de la proyección: SIEMPRE arriba a la derecha, junto a la
          bandera (como el mockup). Pegada al final punteado caía ENCIMA de la
          línea y del marcador (Q9). */}
      {!compact && showProjection && projectedLabel !== null ? (
        <span
          aria-hidden
          data-slot="route-projection"
          className="absolute top-0 -translate-x-full pr-3 text-[11px] leading-4 font-medium text-foreground whitespace-nowrap"
          style={{ left: track(1) }}
        >
          {projectedLabel}
        </span>
      ) : null}

      {/* Con la marca arriba: todas las semanas debajo y la de hoy resaltada. */}
      {!compact && todayLabel !== null && expected !== null ? (
        <span
          aria-hidden
          data-slot="route-today-label"
          className={cn(
            "absolute top-0 text-[11.5px] leading-4 font-medium whitespace-nowrap text-foreground",
            todayAnchor === "start" ? "-translate-x-2" : todayAnchor === "end" ? "-translate-x-[calc(100%-0.5rem)]" : "-translate-x-1/2",
          )}
          style={{ left: track(expected) }}
        >
          {todayLabel}
        </span>
      ) : null}
      {!compact && todayLabel !== null
        ? weeks.map((week, index) => (
            <span
              key={week.label}
              aria-hidden
              className={cn(
                "absolute bottom-0 -translate-x-1/2 text-[10.5px]",
                index === todayWeek ? "font-medium text-foreground" : "text-muted-foreground",
              )}
              style={{ left: track(week.mid_pct / 100) }}
            >
              {week.label}
            </span>
          ))
        : null}

      {/* Sin marca arriba (el Panel): S1…S5 debajo de la línea y la semana de
          hoy cede su sitio a «hoy», bajo el marcador (arriba chocaría con la
          proyección). */}
      {!compact && todayLabel === null
        ? weeks
            .filter((week, index) => index !== todayWeek && !crowdsToday(week, expected))
            .map((week) => (
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
      {!compact && todayLabel === null && expected !== null ? (
        <span
          aria-hidden
          className="absolute bottom-0 -translate-x-1/2 text-[10.5px] font-medium text-foreground"
          style={{ left: track(expected) }}
        >
          hoy
        </span>
      ) : null}
    </div>
  );
}
