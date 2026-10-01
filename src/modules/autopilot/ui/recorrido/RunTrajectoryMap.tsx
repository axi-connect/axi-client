"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Coins, Flag, Zap } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { StatePillTone } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";

import { destinationRows, exitTitle } from "../../domain/copy";
import type { StopKey, StopState, Trajectory, TrajectoryExit, TrajectoryStop } from "../../domain/trajectory";
import { AxiCoin } from "./AxiCoin";
import {
  AXI_AT,
  cityDots,
  contourPaths,
  cubicPath,
  DEST_POINT,
  emptyBranch,
  EXIT_W,
  exitBranch,
  exitCenters,
  flowWidth,
  MAP_H,
  MAP_W,
  pct,
  pointAt,
  SOURCE_POINT,
  splitAt,
  stopPoints,
} from "./geometry";
import { StatusDot } from "./StatusDot";

export interface RunTrajectoryMapProps {
  trajectory: Trajectory;
  /** La salida corre: Axi late y el tramo se parte en él. */
  running: boolean;
  paused: boolean;
  /** La línea de estado: punto + texto · «Salida de hoy, 8:00» · modo. */
  status: { label: string; tone: StatePillTone; live: boolean };
  startedLabel: string;
  modeLabel: string | null;
  /** `nowLine`: la frase grande que encabeza el mapa. */
  now: { title: string; detail: string };
  failed: boolean;
  /** «Google Maps · Restaurantes · Medellín». */
  source: { label: string; initial: string; summary: string } | null;
  /** El tope de la salida: lo gastado contra `budget.per_run`. */
  credits: { spent: number; cap: number | null };
  next: string | null;
  nextDeparture: string | null;
  /** Para «Lo que viene» sin datos: «Si responden, {agente} conversa y te avisa». */
  agentName: string | null;
  /** El tope de grosor: la parada más concurrida (o las cuentas por salida). */
  maxFlow: number;
  selected: StopKey | null;
  onSelect: (key: StopKey) => void;
  /** «Salir de nuevo» tras un fallo; sin permiso, no se pinta. */
  onRetry?: () => void;
}

/**
 * La tarjeta de la ruta de una salida (Rutas de captación, R1): arriba la
 * frase de ahora en grande; en medio el mapa —un tramo por parada, tan grueso
 * como las cuentas que pasan, con sus desvíos a las cajas de motivos, el peaje
 * de calificar y «Lo que viene»— y abajo el tope, lo que sigue y la próxima
 * salida. Con la caja por debajo de 760 px la ruta se pone de pie.
 *
 * Un solo trazo por tramo (pedido del dueño): detrás de Axi sólido, delante
 * punteado, partido justo en él. Cada parada es un botón que filtra las cuentas.
 */
export function RunTrajectoryMap(props: RunTrajectoryMapProps) {
  const { status, startedLabel, modeLabel, now, failed, source, credits, next, nextDeparture, onRetry } = props;
  const atCap = credits.cap !== null && credits.spent >= credits.cap;
  return (
    <section aria-label="La ruta de esta salida" className="@container/trip bg-card border-border min-w-0 overflow-hidden rounded-3xl border">
      <div className="relative z-[3] flex flex-wrap items-start justify-between gap-x-5 gap-y-3 px-[18px] pt-5 @[47.5rem]/trip:px-[26px] @[47.5rem]/trip:pt-6">
        <div className="min-w-0 max-w-[40rem]">
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]">
            <StatusDot tone={status.tone} live={status.live} className="text-foreground">
              {status.label}
            </StatusDot>
            <span aria-hidden>·</span>
            <span className="whitespace-nowrap">{startedLabel}</span>
            {modeLabel !== null && (
              <>
                <span aria-hidden>·</span>
                <span className="whitespace-nowrap">{modeLabel}</span>
              </>
            )}
          </p>
          <h2 className="font-heading mt-2 text-[23px] leading-[1.12] font-bold tracking-[-0.03em] text-balance @[47.5rem]/trip:text-[28px]">
            {now.title}
          </h2>
          <p className={cn("mt-1.5 text-sm text-pretty", failed ? "text-destructive" : "text-muted-foreground")}>{now.detail}</p>
        </div>
        <div className="flex max-w-full min-w-0 flex-col items-start gap-2.5 @[47.5rem]/trip:items-end">
          {source !== null && <SourceChip source={source} />}
          {failed && onRetry !== undefined && (
            <Button variant="contrast" size="sm" className="rounded-full" onClick={onRetry}>
              <Zap aria-hidden className="size-3.5" />
              Salir de nuevo
            </Button>
          )}
        </div>
      </div>

      <div className="hidden @[47.5rem]/trip:block">
        <WideMap {...props} />
      </div>
      <div className="px-[18px] pt-2 pb-1.5 @[47.5rem]/trip:hidden">
        <VerticalRoute {...props} />
      </div>

      <div className="border-border text-muted-foreground flex flex-wrap items-center justify-between gap-x-[18px] gap-y-2 border-t px-[18px] pt-3 pb-4 text-[12.5px] @[47.5rem]/trip:px-5">
        <span className="flex items-center gap-2.5">
          {credits.cap !== null && (
            <span
              role="meter"
              aria-label="Créditos de esta salida"
              aria-valuemin={0}
              aria-valuemax={credits.cap}
              aria-valuenow={Math.min(credits.spent, credits.cap)}
              className="bg-muted block h-1 w-[72px] overflow-hidden rounded-full"
            >
              <i
                className={cn("block h-full rounded-full", atCap ? "bg-warning" : "bg-foreground")}
                style={{ width: `${String(credits.cap === 0 ? 0 : Math.max(credits.spent > 0 ? 3 : 0, Math.min(100, (credits.spent / credits.cap) * 100)))}%` }}
              />
            </span>
          )}
          <span>
            <b className="text-foreground font-medium tabular-nums">
              {credits.cap === null ? `${String(credits.spent)} créditos` : `${String(credits.spent)} de ${String(credits.cap)} créditos`}
            </b>
            {credits.cap !== null && <> · {atCap ? "llegó al tope" : `dentro del tope · ${String(Math.max(0, credits.cap - credits.spent))} de reserva`}</>}
          </span>
        </span>
        {next !== null && (
          <span className="flex items-center gap-1.5">
            <ArrowRight aria-hidden className="size-3.5" />
            {next}
          </span>
        )}
        {nextDeparture !== null && (
          <span>
            Próxima salida: <b className="text-foreground font-medium">{nextDeparture}</b>
          </span>
        )}
      </div>
    </section>
  );
}

function SourceChip({ source }: { source: NonNullable<RunTrajectoryMapProps["source"]> }) {
  const text = `${source.label} · ${source.summary}`;
  return (
    <span className="border-border bg-background inline-flex h-8 max-w-full min-w-0 items-center gap-2 rounded-full border pr-3 pl-[5px] text-[13px]">
      <span aria-hidden className="bg-foreground text-background grid size-[22px] shrink-0 place-items-center rounded-full text-[11px] font-semibold">
        {source.initial}
      </span>
      <span className="truncate" title={text}>
        {text}
      </span>
    </span>
  );
}

/** Lo que el lector de pantalla oye de una parada: nombre, cifra y cuándo terminó. */
function stopSpeech(stop: TrajectoryStop): string {
  const count = stop.count === null ? "aún no llega" : `${String(stop.count)} ${stop.count === 1 ? "cuenta" : "cuentas"}`;
  const state: Record<StopState, string> = {
    done: "",
    now: ", en curso",
    wait: ", espera tu aprobación",
    fail: ", aquí se detuvo",
    todo: "",
  };
  const time = stop.time !== null && stop.time !== "ahora" ? `, terminó a las ${stop.time}` : "";
  return `${stop.label}: ${count}${state[stop.state]}${time}`;
}

/** Hasta dónde va el trazo sólido y dónde va Axi (tramo + fracción). */
function routeTargets(trajectory: Trajectory, running: boolean): { solid: number; axi: number } {
  const n = trajectory.stops.length;
  const current = trajectory.currentIndex;
  if (current >= n) return { solid: n + 1, axi: n + 1 };
  if (current < 0) return { solid: 0, axi: 0 };
  return { solid: running ? current + AXI_AT : current + 1, axi: current + AXI_AT };
}

/**
 * La posición animada: cuando la salida avanza, Axi viaja en 1,2 s y el trazo
 * sólido avanza con él; con movimiento reducido salta de parada en parada.
 */
function useTravel(target: number): number {
  const [at, setAt] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    const from = current.current;
    const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || target <= from || typeof window.requestAnimationFrame !== "function") {
      current.current = target;
      setAt(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const u = Math.min(1, (now - start) / 1200);
      const eased = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
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
  now: "border-brand bg-card shadow-[0_0_0_6px_color-mix(in_srgb,var(--axi-brand)_18%,transparent)]",
  wait: "border-warning bg-card shadow-[0_0_0_6px_color-mix(in_srgb,var(--axi-warning)_20%,transparent)]",
  fail: "border-destructive bg-card shadow-[0_0_0_6px_color-mix(in_srgb,var(--axi-destructive)_16%,transparent)]",
  todo: "border-foreground/35 bg-card",
};
/** Pausada: el nodo de la parada en curso, sin color de estado. */
const NODE_PAUSED = "border-foreground bg-card shadow-[0_0_0_6px_color-mix(in_srgb,var(--foreground)_10%,transparent)]";

/** Las paradas por donde puede salir alguien: su desvío va punteado aunque no salga nadie. */
const EXIT_STOPS: readonly StopKey[] = ["qualify", "promote", "gate", "approve", "contact"];

function WideMap({ trajectory, running, paused, credits, agentName, maxFlow, selected, onSelect }: RunTrajectoryMapProps) {
  const gradient = useId();
  const { stops, exits, currentIndex } = trajectory;
  const points = stopPoints(stops.length);
  const indexOf = (key: StopKey) => stops.findIndex((stop) => stop.key === key);
  const finished = currentIndex >= stops.length;
  const targets = routeTargets(trajectory, running);
  const at = useTravel(targets.solid);
  const { solid, todo } = splitAt(points, at);
  const axi = pointAt(points, Math.min(at, targets.axi));
  const widths = [...stops.map((stop) => flowWidth(stop.count, maxFlow)), flowWidth(stops.at(-1)?.count ?? null, maxFlow)];
  // Cada parada lleva su anchura de etiqueta: el hueco entre paradas, en `cqw` del mapa.
  const labelWidth = `${String((((points[1]?.x ?? MAP_W) - (points[0]?.x ?? 0)) * 0.98 * 100) / MAP_W)}cqw`;

  const branches = exits.map((exit) => ({ exit, ...exitBranch(points[indexOf(exit.at)] ?? SOURCE_POINT) }));
  const centers = exitCenters(branches.map((branch) => branch.x));
  const empty = EXIT_STOPS.filter((key) => {
    const index = indexOf(key);
    return index >= 0 && stops[index]?.state === "done" && !exits.some((exit) => exit.at === key);
  });
  const found = stops[0]?.count ?? 0;
  const qualified = stops.find((stop) => stop.key === "qualify")?.count ?? 0;
  const qualifyIndex = indexOf("qualify");
  const toll =
    trajectory.credits !== null && trajectory.credits > 0 && qualifyIndex >= 0
      ? { from: points[qualifyIndex] ?? SOURCE_POINT, to: points[qualifyIndex + 1] ?? DEST_POINT }
      : null;
  const destination = destinationRows(trajectory.destination, agentName ?? undefined);

  return (
    <>
      <div className="relative w-full" style={{ aspectRatio: `${String(MAP_W)} / ${String(MAP_H)}` }}>
        <svg aria-hidden viewBox={`0 0 ${String(MAP_W)} ${String(MAP_H)}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
          <defs>
            <linearGradient id={gradient} x1="0" x2="1">
              <stop offset="0" stopColor="var(--axi-brand)" />
              <stop offset="1" stopColor="var(--axi-brand-2)" />
            </linearGradient>
          </defs>
          <g>
            {contourPaths().map((contour, index) => (
              <path key={index} d={contour.d} fill="none" strokeWidth={1} className={contour.soft ? "stroke-foreground/[0.03]" : "stroke-foreground/5"} />
            ))}
          </g>
          <g>
            {cityDots(found > 0 ? found : 25).map((dot, index) => (
              <circle key={index} cx={dot.x} cy={dot.y} r={2.2} className={found > 0 && index < qualified ? "fill-brand" : "fill-foreground/40"} />
            ))}
          </g>
          {branches.map(({ exit, d }) => (
            <path key={exit.at} data-exit="taken" d={d} fill="none" strokeWidth={1.5} strokeLinecap="round" className="stroke-foreground/[0.16]" />
          ))}
          {empty.map((key) => (
            <path
              key={key}
              data-exit="empty"
              d={emptyBranch(points[indexOf(key)] ?? SOURCE_POINT)}
              fill="none"
              strokeWidth={1.5}
              strokeDasharray="3 6"
              className="stroke-foreground/[0.22]"
            />
          ))}
          {todo.map((cubic, index) =>
            cubic === null ? null : (
              <path
                key={`todo-${String(index)}`}
                d={cubicPath(cubic)}
                fill="none"
                strokeWidth={2}
                strokeDasharray="2 8"
                strokeLinecap="round"
                className="stroke-foreground/35"
                opacity={index === stops.length ? 0.6 : 1}
              />
            ),
          )}
          <g data-flows>
            {solid.map((cubic, index) =>
              cubic === null ? null : (
                <path
                  key={`flow-${String(index)}`}
                  d={cubicPath(cubic)}
                  fill="none"
                  stroke={`url(#${gradient})`}
                  strokeLinecap="round"
                  strokeWidth={Math.max(2, widths[index] ?? 2)}
                />
              ),
            )}
          </g>
        </svg>

        {stops.map((stop, index) => {
          const point = points[index] ?? SOURCE_POINT;
          const previous = stops[index - 1]?.count ?? null;
          const node = paused && index === currentIndex ? NODE_PAUSED : NODE[stop.state];
          return (
            <div
              key={stop.key}
              data-state={stop.state}
              className="absolute z-[2] grid -translate-x-1/2 -translate-y-1/2 place-items-center"
              style={{ left: pct(point.x, MAP_W), top: pct(point.y, MAP_H) }}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 leading-none whitespace-nowrap tabular-nums",
                  stop.state === "todo" ? "text-muted-foreground text-base" : "font-heading text-[26px] font-bold tracking-[-0.02em]",
                )}
              >
                {stop.count === null ? "—" : String(stop.count)}
                {stop.state === "now" && stop.count !== null && previous !== null && previous > 0 && (
                  <small className="text-muted-foreground ml-[3px] font-sans text-[11px] font-medium tracking-normal">de {String(previous)}</small>
                )}
              </span>
              <button
                type="button"
                aria-pressed={selected === stop.key}
                aria-label={`${stopSpeech(stop)}. Filtrar las cuentas de esta parada`}
                onClick={() => onSelect(stop.key)}
                className="focus-visible:outline-ring relative grid size-6 place-items-center rounded-full before:absolute before:-inset-2.5 focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                <span
                  className={cn(
                    "block border-2",
                    stop.gate ? "size-3.5 rotate-45 rounded-[4px]" : "size-4 rounded-full",
                    node,
                    selected === stop.key && "outline-foreground outline-2 outline-offset-4",
                  )}
                />
              </button>
              <span
                aria-hidden
                className="pointer-events-none absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 text-center leading-tight"
                style={{ width: labelWidth }}
              >
                <b className={cn("block text-[12.5px] text-balance", stop.state === "todo" ? "text-muted-foreground font-normal" : "font-medium")}>{stop.label}</b>
                <span className="text-muted-foreground block text-[11px] text-balance">{stop.sub}</span>
                {stop.time !== null && <span className="text-muted-foreground block font-mono text-[10.5px]">{stop.time}</span>}
              </span>
            </div>
          );
        })}

        {toll !== null && (
          <span
            className="bg-background border-border absolute z-[2] inline-flex h-[22px] -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border px-2 text-[11px] whitespace-nowrap shadow-[var(--shadow-float)]"
            // Un poco pasada la mitad del tramo: a la mitad pisaba la cifra de «Calificar» en cajas de ~950 px.
            style={{ left: pct(toll.from.x + (toll.to.x - toll.from.x) * 0.58, MAP_W), top: pct((toll.from.y + toll.to.y) / 2 - 30, MAP_H) }}
            title="Revelar el correo: 1 crédito por cuenta y el celular, 8; de tu saldo en Apollo y solo si lo encuentra"
          >
            <Coins aria-hidden className="size-3 text-[var(--axi-amber)]" />
            {String(trajectory.credits)} {trajectory.credits === 1 ? "crédito" : "créditos"}
          </span>
        )}

        <div
          className="absolute z-[2] w-32 -translate-x-1/2 text-center"
          style={{ left: `min(${pct(DEST_POINT.x, MAP_W)}, calc(100% - 4.25rem))`, top: pct(DEST_POINT.y - 15, MAP_H) }}
        >
          <span
            aria-hidden
            className={cn(
              "bg-background mx-auto mb-1.5 grid size-[30px] place-items-center rounded-full border-[1.5px]",
              finished ? "border-foreground text-foreground border-solid" : "border-foreground/35 text-muted-foreground border-dashed",
            )}
          >
            <Flag className="size-3.5" />
          </span>
          <b className="block text-[12.5px] font-medium">Lo que viene</b>
          {destination.rows.length > 0 ? (
            <ul className="text-muted-foreground mt-1.5 text-[11.5px]">
              {destination.rows.map((row) => (
                <li key={row.key} className="border-border flex justify-between gap-2 border-t border-dashed py-0.5">
                  <span>{row.label.charAt(0).toUpperCase() + row.label.slice(1)}</span>
                  <b className="text-foreground text-xs tabular-nums">{String(row.count)}</b>
                </li>
              ))}
            </ul>
          ) : (
            destination.empty !== null && <p className="text-muted-foreground mt-1 text-[11.5px] text-balance">{destination.empty}</p>
          )}
        </div>

        <AxiCoin
          live={running}
          paused={paused}
          className="absolute z-[4] -translate-x-1/2 -translate-y-1/2"
          style={{ left: pct(axi.x, MAP_W), top: pct(axi.y, MAP_H) }}
        />
      </div>

      {/* Las cajas de desvío, bajo su rama: en flujo, crecen con su texto y no se pisan ni se salen. */}
      <div className="flex flex-wrap items-start pb-[18px]">
        {branches.map(({ exit }, order) => {
          const left = (centers[order] ?? 0) - EXIT_W / 2;
          const previous = centers[order - 1];
          const gap = left - (previous === undefined ? 0 : previous + EXIT_W / 2);
          return <ExitCard key={exit.at} exit={exit} className="shrink-0" style={{ marginLeft: pct(gap, MAP_W), width: pct(EXIT_W, MAP_W) }} />;
        })}
      </div>
      {/* Sin desvíos, el mapa cierra con su respiro. */}
      {branches.length === 0 && credits.cap === null && <span className="block h-2" />}
    </>
  );
}

function ExitCard({ exit, className, style }: { exit: TrajectoryExit; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn("bg-background border-border rounded-2xl border px-3 py-2.5 text-xs shadow-[var(--shadow-float)]", className)} style={style}>
      <p className="mb-1 text-[12.5px] font-semibold text-pretty">{exitTitle(exit)}</p>
      {exit.rows.length > 0 && (
        <ul className="flex flex-col">
          {exit.rows.map((row) => (
            <li key={row.reason} className="text-muted-foreground flex items-baseline justify-between gap-2.5 py-px">
              {/* Completo, nunca cortado: un motivo legal (RNE, habeas data) se lee entero; la caja crece hacia abajo. */}
              <span className="min-w-0 text-pretty break-words">{row.label}</span>
              <b className="text-foreground shrink-0 font-medium tabular-nums">{String(row.count)}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const V_NODE: Record<StopState, string> = {
  done: "border-foreground bg-foreground",
  now: "border-brand bg-card shadow-[0_0_0_5px_color-mix(in_srgb,var(--axi-brand)_18%,transparent)]",
  wait: "border-warning bg-card shadow-[0_0_0_5px_color-mix(in_srgb,var(--axi-warning)_20%,transparent)]",
  fail: "border-destructive bg-card",
  todo: "border-foreground/35 bg-card",
};

function VerticalRoute({ trajectory, paused, running, agentName, maxFlow }: RunTrajectoryMapProps) {
  const { stops, exits, currentIndex } = trajectory;
  const n = stops.length;
  const finished = currentIndex >= n;
  const destination = destinationRows(trajectory.destination, agentName ?? undefined);
  return (
    <ol aria-label="La ruta de esta salida" className="flex flex-col pt-1.5">
      {stops.map((stop, index) => {
        const exit = exits.find((entry) => entry.at === stop.key);
        const nextStop = stops[index + 1];
        const nextSolid = nextStop === undefined ? finished : nextStop.state !== "todo";
        const bar = Math.max(4, flowWidth(nextStop?.count ?? stop.count, maxFlow) * 0.8);
        const node = paused && index === currentIndex ? "border-foreground bg-card" : V_NODE[stop.state];
        return (
          <li key={stop.key} data-state={stop.state} className="relative grid min-h-[54px] grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-x-2.5">
            <span className="sr-only">{stopSpeech(stop)}</span>
            <span aria-hidden className="relative flex justify-center self-stretch">
              <span
                className={cn(
                  "absolute top-2.5 -bottom-2.5 rounded-full",
                  nextSolid ? "bg-[linear-gradient(180deg,var(--axi-brand),var(--axi-brand-2))]" : "border-foreground/35 w-0! border-l-2 border-dotted",
                )}
                style={{ width: nextSolid ? bar : undefined }}
              />
              <span className={cn("relative z-[1] mt-[3px] block size-4 border-2", stop.gate ? "scale-90 rotate-45 rounded-[4px]" : "rounded-full", node)} />
              {index === currentIndex && <AxiCoin live={running} paused={paused} className="absolute -top-[9px] left-0.5 z-[3]" />}
            </span>
            <span aria-hidden className="min-w-0">
              <b className={cn("block text-sm", stop.state === "todo" ? "text-muted-foreground font-normal" : "font-medium")}>{stop.label}</b>
              <span className="text-muted-foreground block text-xs">{stop.sub}</span>
            </span>
            <span aria-hidden className={cn("text-right leading-[1.1] tabular-nums", stop.state === "todo" ? "text-muted-foreground text-[15px]" : "font-heading text-[22px] font-bold")}>
              {stop.count === null ? "—" : String(stop.count)}
              {stop.time !== null && <small className="text-muted-foreground block font-mono text-[10.5px] font-normal tracking-normal">{stop.time}</small>}
            </span>
            {exit !== undefined && <ExitCard exit={exit} className="col-span-2 col-start-2 mt-1 mb-3 shadow-none" />}
          </li>
        );
      })}
      <li data-state={finished ? "done" : "todo"} className="relative grid min-h-[54px] grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-x-2.5">
        <span aria-hidden className="relative flex justify-center self-stretch">
          <span className="border-foreground/35 bg-card relative z-[1] mt-[3px] block size-4 rounded-full border-2 border-dashed" />
          {finished && <AxiCoin className="absolute -top-[9px] left-0.5 z-[3]" />}
        </span>
        <span className="min-w-0">
          <b className="block text-sm font-medium">Lo que viene</b>
          <span className="text-muted-foreground block text-xs text-pretty">
            {destination.rows.length > 0
              ? destination.rows.map((row) => `${String(row.count)} ${row.label}`).join(" · ")
              : destination.empty}
          </span>
        </span>
        <span />
      </li>
    </ol>
  );
}
