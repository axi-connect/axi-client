"use client";

import { useEffect, useRef, useState } from "react";
import { Flag, Plane } from "lucide-react";

import { cn } from "@/core/lib/utils";

import { exitTitle } from "../../domain/copy";
import type { StopKey, StopState, Trajectory, TrajectoryExit, TrajectoryStop } from "../../domain/trajectory";
import {
  curvePath,
  EXIT_TOP,
  EXIT_W,
  exitCenters,
  exitPath,
  MAP_H,
  MAP_W,
  pct,
  SOURCE_POINT,
  splitRoute,
  stopPoints,
  tailPoint,
} from "./geometry";

export interface RunTrajectoryMapProps {
  trajectory: Trajectory;
  /** «Google Maps · Restaurantes · Medellín». */
  source: { label: string; initial: string; summary: string };
  /** La ejecución está volando: el avión va en el tramo que llega a la parada en curso. */
  flying: boolean;
}

/**
 * El recorrido de una ejecución (U1): las paradas con cuántas cuentas pasan
 * por cada una y, debajo, por dónde salió cada descartada y por qué.
 *
 * En una caja ancha (≥ 36 rem) es el mapa en SVG; en una estrecha, la misma
 * lista en vertical. Se monta uno u otro por `@container` (el oculto sale con
 * `display: none`, así que el lector de pantalla no lo lee dos veces).
 *
 * Un solo trazo por tramo (pedido del dueño): detrás del avión la línea es
 * sólida y delante punteada; la curva se parte justo en el avión. El avance de
 * las cuentas se lee en la cifra de cada parada, no en puntos que corren.
 */
export function RunTrajectoryMap({ trajectory, source, flying }: RunTrajectoryMapProps) {
  return (
    <section aria-label="Recorrido de la ejecución" className="@container/trip min-w-0">
      <div className="hidden @[36rem]/trip:block">
        <WideMap trajectory={trajectory} source={source} flying={flying} />
      </div>
      <div className="@[36rem]/trip:hidden">
        <VerticalRoute trajectory={trajectory} source={source} />
      </div>
    </section>
  );
}

/** Dónde descansa el avión en su tramo mientras el paso trabaja: ya cerca de la parada. */
const PLANE_REST = 0.6;
const TRAVEL_MS = 1200;

/**
 * Hasta dónde va el trazo sólido (tramo + fracción). Cuando el paso avanza, el
 * avión viaja del punto anterior al nuevo en `TRAVEL_MS`; con movimiento
 * reducido salta de parada en parada.
 */
function useRoutePosition(target: number): number {
  const [at, setAt] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    const from = current.current;
    const reduced =
      typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || target <= from || typeof window.requestAnimationFrame !== "function") {
      current.current = target;
      setAt(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const u = Math.min(1, (now - start) / TRAVEL_MS);
      const eased = 1 - (1 - u) ** 3;
      current.current = from + (target - from) * eased;
      setAt(current.current);
      if (u < 1) frame = window.requestAnimationFrame(step);
    };
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [target]);
  return at;
}

const NODE: Record<StopState, string> = {
  done: "border-foreground bg-foreground",
  now: "border-foreground border-[3px] bg-card shadow-[0_0_0_6px_color-mix(in_srgb,var(--foreground)_10%,transparent)]",
  wait: "border-warning border-[3px] bg-card shadow-[0_0_0_6px_color-mix(in_srgb,var(--warning)_22%,transparent)]",
  fail: "border-destructive bg-destructive",
  todo: "border-muted-foreground bg-card",
};

/** Lo que el lector de pantalla oye de una parada: nombre, cifra y en qué va. */
function stopSpeech(stop: TrajectoryStop): string {
  const state: Record<StopState, string> = {
    done: "terminada",
    now: "en curso",
    wait: "espera tu aprobación",
    fail: "aquí se detuvo",
    todo: "aún no llega",
  };
  return `${stop.label}: ${stop.count === null ? "sin cifra" : `${String(stop.count)} cuentas`}, ${state[stop.state]}`;
}

function SourceChip({ source }: { source: RunTrajectoryMapProps["source"] }) {
  return (
    <span className="bg-card ring-border inline-flex h-8 max-w-full min-w-0 items-center gap-2 rounded-full pr-3 pl-1 text-xs font-medium ring-1">
      <span aria-hidden className="bg-foreground text-background grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold">
        {source.initial}
      </span>
      <span className="truncate" title={`${source.label} · ${source.summary}`}>
        {source.label} · {source.summary}
      </span>
    </span>
  );
}

/** Las paradas donde una cuenta puede salir: su salida se dibuja punteada aunque no salga nadie. */
const EXIT_STOPS: readonly StopKey[] = ["qualify", "gate", "approve", "contact"];

function WideMap({ trajectory, source, flying }: RunTrajectoryMapProps) {
  const { stops, exits, currentIndex } = trajectory;
  const points = stopPoints(stops.length);
  const tail = tailPoint(points);
  const indexOf = (key: StopKey) => stops.findIndex((stop) => stop.key === key);
  const finished = currentIndex >= stops.length;
  const plane = flying && currentIndex >= 0 && !finished;
  // El nombre de cada parada ocupa su hueco entre paradas, no más: así no pisa a la vecina.
  // En `cqw` del mapa: un % aquí sería del `li`, que mide lo que el nodo.
  const labelWidth = `${String((((points[1]?.x ?? MAP_W) - (points[0]?.x ?? 0)) * 0.94 * 100) / MAP_W)}cqw`;

  // Hasta dónde llega lo sólido: al avión si vuela; si no, hasta la parada en curso (o nada en cola).
  const target = finished ? stops.length : currentIndex < 0 ? 0 : plane ? currentIndex + PLANE_REST : currentIndex + 1;
  const at = useRoutePosition(target);
  const route = splitRoute(points, at);

  const centers = exitCenters(exits.map((exit) => (points[indexOf(exit.at)]?.x ?? 0) + 24));
  const placedExits = exits.map((exit, order) => {
    const from = points[indexOf(exit.at)] ?? SOURCE_POINT;
    return { exit, from, to: { x: centers[order] ?? from.x, y: EXIT_TOP } };
  });
  // Salidas sin nadie todavía: un trazo punteado corto, sin caja.
  const emptyExits = EXIT_STOPS.filter((key) => indexOf(key) >= 0 && !exits.some((exit) => exit.at === key)).map((key) => {
    const from = points[indexOf(key)] ?? SOURCE_POINT;
    return { key, from, to: { x: from.x + 24, y: EXIT_TOP - 40 } };
  });

  return (
    <div className="border-border bg-card flex flex-col overflow-hidden rounded-3xl border pb-4">
    <div className="relative" style={{ aspectRatio: `${String(MAP_W)} / ${String(MAP_H)}` }}>
      <div className="absolute inset-x-5 top-4 z-[1] flex min-w-0 items-center justify-between gap-3">
        <SourceChip source={source} />
        <span aria-hidden className="text-muted-foreground flex shrink-0 items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5">
            <i className="bg-foreground h-0.5 w-4 rounded-full" />
            recorrido
          </span>
          <span className="flex items-center gap-1.5">
            <i className="border-muted-foreground w-4 border-t-2 border-dotted" />
            lo que falta
          </span>
          <span className="flex items-center gap-1.5">
            <i className="bg-muted-foreground/60 h-0.5 w-4 rounded-full" />
            salidas
          </span>
        </span>
      </div>

      <svg aria-hidden viewBox={`0 0 ${String(MAP_W)} ${String(MAP_H)}`} className="absolute inset-0 size-full overflow-visible">
        <path d={route.todo} className="stroke-muted-foreground fill-none opacity-70" strokeWidth={2} strokeDasharray="2 7" strokeLinecap="round" />
        <path d={curvePath([points.at(-1) ?? SOURCE_POINT, tail])} className="stroke-muted-foreground fill-none opacity-45" strokeWidth={2} strokeDasharray="2 7" strokeLinecap="round" />
        {emptyExits.map(({ key, from, to }) => (
          <path key={key} data-exit="empty" d={exitPath(from, to)} className="stroke-muted-foreground fill-none opacity-40" strokeWidth={2} strokeDasharray="5 5" />
        ))}
        {placedExits.map(({ exit, from, to }) => (
          <path key={exit.at} data-exit="taken" d={exitPath(from, to)} className="stroke-muted-foreground fill-none" strokeWidth={2} />
        ))}
        {route.done !== "" && at > 0 && <path d={route.done} className="stroke-foreground fill-none" strokeWidth={4} strokeLinecap="round" />}
      </svg>

      <ol className="contents">
        {stops.map((stop, index) => {
          const point = points[index] ?? SOURCE_POINT;
          return (
            <li
              key={stop.key}
              data-state={stop.state}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: pct(point.x, MAP_W), top: pct(point.y, MAP_H) }}
            >
              <span className="sr-only">{stopSpeech(stop)}</span>
              <span
                aria-hidden
                className={cn(
                  "absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-xl leading-none tabular-nums",
                  stop.state === "todo" ? "text-muted-foreground font-normal" : "font-semibold",
                )}
              >
                {stop.count === null ? "—" : String(stop.count)}
              </span>
              <span
                aria-hidden
                className={cn("block size-4 border-2", stop.gate ? "rotate-45 rounded-[5px]" : "rounded-full", NODE[stop.state])}
              />
              <span
                aria-hidden
                className={cn(
                  "bg-card/85 absolute top-6 left-1/2 -translate-x-1/2 rounded-md px-0.5 text-center text-[11px] leading-tight text-balance @[52rem]/trip:text-xs",
                  stop.state === "todo" ? "text-muted-foreground" : "font-medium",
                )}
                style={{ width: labelWidth }}
              >
                {stop.label}
                {stop.sub !== null && <span className="text-muted-foreground mt-0.5 block text-[11px] font-normal">{stop.sub}</span>}
              </span>
            </li>
          );
        })}
      </ol>

      {plane && (
        <span
          aria-hidden
          data-plane
          className="bg-card absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"
          style={{ left: pct(route.plane.x, MAP_W), top: pct(route.plane.y, MAP_H) }}
        >
          {/* El icono mira a 45°: se gira a la tangente del tramo. */}
          <Plane className="fill-foreground text-foreground size-5" style={{ transform: `rotate(${String(route.heading + 45)}deg)` }} />
        </span>
      )}

    </div>

      {/* Las salidas, debajo del recorrido y alineadas con su parada: en flujo, crecen con su texto. */}
      <div className="flex flex-wrap items-start gap-y-3">
        {placedExits.map(({ exit, to }, order) => {
          const left = to.x - EXIT_W / 2;
          const previous = placedExits[order - 1];
          const gap = left - (previous === undefined ? 0 : previous.to.x + EXIT_W / 2);
          return (
            <ExitCard
              key={exit.at}
              exit={exit}
              className="shrink-0"
              style={{ marginLeft: pct(gap, MAP_W), width: pct(EXIT_W, MAP_W) }}
            />
          );
        })}
        <span className="text-muted-foreground ml-auto flex max-w-40 items-start gap-1.5 px-4 text-[11px] leading-snug text-pretty">
          <Flag aria-hidden className="mt-px size-3.5 shrink-0" />
          <span>Después sigue la secuencia: respondió, demo agendada</span>
        </span>
      </div>
    </div>
  );
}

function ExitCard({ exit, className, style }: { exit: TrajectoryExit; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn("bg-card border-border rounded-xl border px-2.5 py-2 text-[11.5px] leading-snug shadow-sm", className)} style={style}>
      <p className="text-xs font-semibold text-pretty">{exitTitle(exit)}</p>
      {exit.rows.length > 0 && (
        <ul className="mt-0.5 flex flex-col gap-0.5">
          {exit.rows.map((row) => (
            <li key={row.reason} className="text-muted-foreground flex items-baseline justify-between gap-2">
              {/* Completo, nunca cortado: un motivo legal (RNE, habeas data) se lee entero; la caja crece hacia abajo. */}
              <span className="min-w-0 text-pretty break-words">{row.label}</span>
              <span className="text-foreground shrink-0 font-mono tabular-nums">{String(row.count)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VerticalRoute({ trajectory, source }: Pick<RunTrajectoryMapProps, "trajectory" | "source">) {
  const { stops, exits } = trajectory;
  return (
    <div className="border-border bg-card flex min-w-0 flex-col gap-4 rounded-3xl border p-5">
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h3 className="text-muted-foreground text-xs font-normal">Recorrido</h3>
        <SourceChip source={source} />
      </header>
      <ol className="flex flex-col">
        {stops.map((stop, index) => {
          const exit = exits.find((entry) => entry.at === stop.key);
          const last = index === stops.length - 1;
          return (
            <li
              key={stop.key}
              data-state={stop.state}
              className="relative grid grid-cols-[1.75rem_minmax(0,1fr)_auto] gap-x-3 pb-3.5"
            >
              <span className="sr-only">{stopSpeech(stop)}</span>
              {!last && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-5 -bottom-0.5 left-[13px] w-0.5",
                    stop.state === "done" ? "bg-foreground" : "border-muted-foreground/70 border-l-2 border-dotted",
                  )}
                />
              )}
              <span
                aria-hidden
                className={cn(
                  "relative z-[1] mx-[5px] mt-0.5 block size-[18px] border-2",
                  stop.gate ? "rotate-45 rounded-[5px]" : "rounded-full",
                  NODE[stop.state],
                )}
              />
              <span aria-hidden className="min-w-0 text-sm">
                <span className={stop.state === "todo" ? "text-muted-foreground" : "font-medium"}>{stop.label}</span>
                {stop.sub !== null && <span className="text-muted-foreground text-xs"> · {stop.sub}</span>}
              </span>
              <span
                aria-hidden
                className={cn("font-mono text-lg leading-tight tabular-nums", stop.state === "todo" ? "text-muted-foreground" : "font-semibold")}
              >
                {stop.count === null ? "—" : String(stop.count)}
              </span>
              {exit !== undefined && <ExitCard exit={exit} className="col-span-2 col-start-2 mt-1.5 border-dashed shadow-none" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
