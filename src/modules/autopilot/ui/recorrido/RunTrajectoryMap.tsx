"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Zap } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { StatePillTone } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";

import { destinationRows, exitTitle } from "../../domain/copy";
import type { StopKey, StopState, Trajectory, TrajectoryExit, TrajectoryStop } from "../../domain/trajectory";
import { AIRPORT, airway, CHART_H, CHART_W, headingOf, LAND, RESTRICTED, TOP_PLANE_PATH, TOWER } from "./airChart";
import { AXI_AT, cubicPath, EXIT_W, exitCenters, flowWidth, pct, splitCubic, type Cubic, type Point } from "./geometry";
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
  /** «8:00»: a qué hora salió (el rótulo de la torre). */
  departedHour: string | null;
  selected: StopKey | null;
  onSelect: (key: StopKey) => void;
  /** «Salir de nuevo» tras un fallo; sin permiso, no se pinta. */
  onRetry?: () => void;
}

/**
 * La tarjeta del piloto de una salida (Piloto, delta v4): una carta
 * de navegación aérea nocturna, en su propia superficie oscura en los dos temas
 * (`.surface-dark`). Arriba, la frase de ahora en grande; en medio la carta —la
 * aerovía continua de la torre al aeropuerto, los fijos (las paradas), el
 * espacio restringido de tu política que la aerovía rodea, el circuito de espera
 * sobre «Tu aprobación», el avión con su estela y los desvíos a sus cajas— y
 * abajo el tope, lo que sigue y la próxima salida. Por debajo de 760 px, la aerovía
 * vertical sobre la misma superficie.
 *
 * Un solo trazo por tramo (pedido del dueño): detrás del avión sólido, delante
 * punteado, partido justo en él. Cada fijo es un botón que filtra las cuentas.
 */
export function RunTrajectoryMap(props: RunTrajectoryMapProps) {
  const { status, startedLabel, modeLabel, now, failed, source, credits, next, nextDeparture, onRetry } = props;
  const atCap = credits.cap !== null && credits.spent >= credits.cap;
  return (
    <section
      aria-label="La carta de esta salida"
      className="surface-dark @container/trip border-border text-foreground min-w-0 overflow-hidden rounded-3xl border bg-[radial-gradient(120%_90%_at_20%_0%,color-mix(in_srgb,var(--foreground)_6%,var(--background))_0%,var(--background)_55%)]"
    >
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
        <NightChart {...props} />
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

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * La posición animada en la aerovía (tramo + fracción): cuando la salida
 * avanza, el avión viaja en 1,2 s y lo volado avanza con él; con movimiento
 * reducido salta de fijo en fijo.
 */
function useTravel(target: number): number {
  const [at, setAt] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    const from = current.current;
    if (prefersReducedMotion() || target <= from || typeof window.requestAnimationFrame !== "function") {
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

/** Cada tramo, partido en `at`: lo volado y lo que falta (un solo trazo que se vuelve sólido en el avión). */
function splitSegments(segments: readonly Cubic[], at: number): { flown: (Cubic | null)[]; ahead: (Cubic | null)[] } {
  const flown: (Cubic | null)[] = [];
  const ahead: (Cubic | null)[] = [];
  segments.forEach((cubic, index) => {
    const t = Math.min(1, Math.max(0, at - index));
    if (t >= 1) {
      flown.push(cubic);
      ahead.push(null);
    } else if (t <= 0) {
      flown.push(null);
      ahead.push(cubic);
    } else {
      const [behind, rest] = splitCubic(cubic, t);
      flown.push(behind);
      ahead.push(rest);
    }
  });
  return { flown, ahead };
}

/** Los fijos, como triángulos (16 × 14): hecho blanco, en curso coral, espera ámbar, falla rojo, pausa hueco. */
const FIX: Record<StopState, string> = {
  done: "fill-foreground stroke-foreground",
  now: "fill-brand stroke-brand drop-shadow-[0_0_6px_var(--axi-brand)]",
  wait: "fill-warning stroke-warning drop-shadow-[0_0_6px_var(--axi-warning)]",
  fail: "fill-destructive stroke-destructive",
  todo: "fill-background stroke-foreground/55",
};
const FIX_PAUSED = "fill-background stroke-foreground";

function NightChart({ trajectory, running, paused, failed, agentName, maxFlow, selected, onSelect, source, departedHour }: RunTrajectoryMapProps) {
  const ids = useId();
  const flowGradient = `${ids}-flow`;
  const hatch = `${ids}-hatch`;
  const vignette = `${ids}-vignette`;
  const trailGradient = `${ids}-trail`;
  const { stops, exits, currentIndex } = trajectory;
  const n = stops.length;
  const { fixes, segments } = airway(n);
  const indexOf = (key: StopKey) => stops.findIndex((stop) => stop.key === key);
  const finished = currentIndex >= n;
  const waiting = stops[currentIndex]?.state === "wait" && stops[currentIndex]?.key === "approve";
  const target = finished ? n + 1 : currentIndex < 0 ? 0 : running ? currentIndex + AXI_AT : currentIndex + 1;
  const at = useTravel(target);
  const { flown, ahead } = splitSegments(segments, at);
  const widths = [...stops.map((stop) => flowWidth(stop.count, maxFlow)), flowWidth(stops.at(-1)?.count ?? null, maxFlow)];
  const labelWidth = `${String((((fixes[1]?.x ?? CHART_W) - (fixes[0]?.x ?? 0)) * 0.98 * 100) / CHART_W)}cqw`;
  const reduced = prefersReducedMotion();

  // El avión: en vuelo al 80 % del tramo de llegada (con su estela); esperando, en el circuito; terminado, en el aeropuerto.
  const approveIndex = indexOf("approve");
  const approveFix = fixes[approveIndex];
  let plane: { at: Point; heading: number } = { at: TOWER, heading: -45 };
  let trail: Cubic | null = null;
  if (waiting && approveFix !== undefined) {
    plane = { at: { x: approveFix.x - 22, y: approveFix.y - 44 }, heading: 180 };
  } else if (finished) {
    const last = segments.at(-1);
    plane = { at: AIRPORT, heading: last === undefined ? 0 : headingOf(last) };
  } else if (currentIndex >= 0) {
    const segment = segments[currentIndex];
    if (segment !== undefined) {
      const t = Math.max(0.001, Math.min(AXI_AT, at - currentIndex));
      const [upto] = splitCubic(segment, t);
      plane = { at: upto[3], heading: headingOf(upto) };
      trail = splitCubic(upto, 0.2)[1];
    }
  }

  const branches = exits.map((exit) => {
    const from = fixes[indexOf(exit.at)] ?? TOWER;
    const x = from.x + (exit.at === "gate" ? 0 : 54);
    return {
      exit,
      x,
      d: `M${fmt(from.x)} ${fmt(from.y)} C${fmt(from.x + 30)} ${fmt(from.y + 10)} ${fmt(x)} ${fmt(from.y + 30)} ${fmt(x)} ${fmt(from.y + 80)} L${fmt(x)} ${fmt(CHART_H + 2)}`,
    };
  });
  const centers = exitCenters(branches.map((branch) => (branch.x / CHART_W) * 1000));
  const blocked = exits.find((exit) => exit.at === "gate")?.total ?? 0;
  const found = stops[0]?.count ?? 0;
  const qualified = stops.find((stop) => stop.key === "qualify")?.count ?? 0;
  const destination = destinationRows(trajectory.destination, agentName ?? undefined);

  return (
    <>
      <div className="relative w-full" style={{ aspectRatio: `${String(CHART_W)} / ${String(CHART_H)}` }}>
        <svg aria-hidden viewBox={`0 0 ${String(CHART_W)} ${String(CHART_H)}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
          <defs>
            <linearGradient id={flowGradient} x1="0" x2="1">
              <stop offset="0" stopColor="var(--axi-brand)" />
              <stop offset="1" stopColor="var(--axi-brand-2)" />
            </linearGradient>
            <pattern id={hatch} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="9" strokeWidth={2} className="stroke-foreground/10" />
            </pattern>
            <radialGradient id={vignette} cx="50%" cy="45%" r="75%">
              <stop offset="55%" style={{ stopColor: "var(--background)", stopOpacity: 0 }} />
              <stop offset="100%" style={{ stopColor: "var(--background)", stopOpacity: 0.55 }} />
            </radialGradient>
            {trail !== null && (
              <linearGradient id={trailGradient} gradientUnits="userSpaceOnUse" x1={trail[0].x} y1={trail[0].y} x2={trail[3].x} y2={trail[3].y}>
                <stop offset="0" style={{ stopColor: "var(--foreground)", stopOpacity: 0 }} />
                <stop offset="1" style={{ stopColor: "var(--foreground)", stopOpacity: 0.7 }} />
              </linearGradient>
            )}
          </defs>

          {/* El paisaje, estático y tenue. */}
          <g fill="none">
            <path d={LAND.grid} strokeWidth={1} className="stroke-foreground/[0.035]" />
            <path d={LAND.river} strokeWidth={34} strokeLinecap="round" className="stroke-foreground/[0.03]" />
            <path d={LAND.contours} strokeWidth={1} className="stroke-foreground/[0.06]" />
            {LAND.farAirways.map((d) => (
              <path key={d} d={d} strokeWidth={1} strokeDasharray="2 6" className="stroke-foreground/10" />
            ))}
          </g>
          <g>
            {LAND.lights.map((light, index) => (
              <circle key={index} cx={light.x} cy={light.y} r={light.glow > 0.8 ? 1.6 : 1} className="fill-foreground" opacity={0.14 + light.glow * 0.3} />
            ))}
          </g>

          {/* El espacio restringido: tu política, que la aerovía rodea. */}
          <path d={LAND.zone} fill={`url(#${hatch})`} strokeWidth={1} strokeDasharray="5 4" className="stroke-foreground/[0.22]" />

          {/* La torre: los anillos del radar, la barrida quieta y los negocios encontrados. */}
          <g fill="none">
            {[16, 30, 44].map((r) => (
              <circle key={r} cx={TOWER.x} cy={TOWER.y} r={r} strokeWidth={1} className="stroke-foreground/[0.16]" />
            ))}
            <line x1={TOWER.x} y1={TOWER.y} x2={TOWER.x + 31} y2={TOWER.y - 31} strokeWidth={1.2} className="stroke-foreground/[0.32]" />
          </g>
          {Array.from({ length: Math.min(found > 0 ? found : 25, 30) }, (_, index) => {
            const a = index * 2.399;
            const r = 5 + Math.sqrt(index) * 6;
            return (
              <circle
                key={index}
                cx={TOWER.x + r * Math.cos(a)}
                cy={TOWER.y + r * Math.sin(a)}
                r={1.6}
                className={found > 0 && index < qualified ? "fill-brand" : "fill-foreground/50"}
              />
            );
          })}

          {/* Los desvíos: ramas de un pelo que bajan a sus cajas. */}
          {branches.map(({ exit, d }) => (
            <path key={exit.at} data-exit="taken" d={d} fill="none" strokeWidth={1.2} className="stroke-foreground/[0.22]" />
          ))}

          {/* La aerovía: lo que falta, punteado; el tramo siguiente avanza solo mientras la salida va en vuelo. */}
          {ahead.map((cubic, index) => {
            if (cubic === null) return null;
            const next = running && index === currentIndex;
            return (
              <path
                key={`ahead-${String(index)}`}
                d={cubicPath(cubic)}
                fill="none"
                strokeWidth={1.6}
                strokeDasharray="3 6"
                strokeLinecap="round"
                className={next ? "stroke-brand/80" : "stroke-foreground/[0.32]"}
              >
                {next && !reduced && <animate attributeName="stroke-dashoffset" from="9" to="0" dur="1.2s" repeatCount="indefinite" />}
              </path>
            );
          })}
          {waiting && approveFix !== undefined && (
            <ellipse cx={approveFix.x} cy={approveFix.y - 34} rx={34} ry={13} fill="none" strokeWidth={1.2} strokeDasharray="4 4" className="stroke-foreground/50" />
          )}
          <g data-flows>
            {flown.map((cubic, index) =>
              cubic === null ? null : (
                <g key={`flown-${String(index)}`}>
                  <path d={cubicPath(cubic)} fill="none" strokeLinecap="round" strokeWidth={(widths[index] ?? 2) + 5} className="stroke-brand opacity-[0.18] blur-[4px]" />
                  <path d={cubicPath(cubic)} fill="none" stroke={`url(#${flowGradient})`} strokeLinecap="round" strokeWidth={Math.max(2, widths[index] ?? 2)} />
                </g>
              ),
            )}
          </g>
          {trail !== null && <path d={cubicPath(trail)} fill="none" stroke={`url(#${trailGradient})`} strokeWidth={2.4} strokeLinecap="round" />}
          <rect width={CHART_W} height={CHART_H} fill={`url(#${vignette})`} />
        </svg>

        {stops.map((stop, index) => {
          const point = fixes[index] ?? TOWER;
          const previous = stops[index - 1]?.count ?? null;
          const holding = waiting && stop.key === "approve";
          const fix = paused && index === currentIndex ? FIX_PAUSED : FIX[stop.state];
          const fuel = stop.key === "qualify" && trajectory.credits !== null && trajectory.credits > 0 ? trajectory.credits : null;
          return (
            <div
              key={stop.key}
              data-state={stop.state}
              className="absolute z-[2] grid -translate-x-1/2 -translate-y-1/2 place-items-center"
              style={{ left: pct(point.x, CHART_W), top: pct(point.y, CHART_H) }}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 leading-none whitespace-nowrap tabular-nums [text-shadow:0_0_8px_var(--background),0_0_3px_var(--background)]",
                  holding ? "bottom-[calc(100%+44px)]" : "bottom-[calc(100%+8px)]",
                  stop.state === "todo" ? "text-foreground/45 text-base" : "font-heading text-2xl font-bold tracking-[-0.02em]",
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
                <svg viewBox="0 0 16 14" width={16} height={14} className={cn("overflow-visible", fix, selected === stop.key && "drop-shadow-[0_0_4px_var(--foreground)]")}>
                  <path d="M8 1 15 13H1Z" strokeWidth={1.5} strokeLinejoin="round" />
                </svg>
              </button>
              <span aria-hidden className="pointer-events-none absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 text-center leading-tight" style={{ width: labelWidth }}>
                <b className={cn("block text-[12.5px] text-balance", stop.state === "todo" ? "text-foreground/60 font-normal" : "font-medium")}>{stop.label}</b>
                <span className="text-foreground/60 block text-[11px] text-balance">{stop.sub}</span>
                {(stop.time !== null || fuel !== null) && (
                  <span className="text-muted-foreground block font-mono text-[10.5px]">
                    {stop.time}
                    {fuel !== null && (
                      <i
                        className="text-[var(--axi-amber)] not-italic"
                        title="Revelar el correo: 1 crédito por cuenta y el celular, 8; de tu saldo en Apollo y solo si lo encuentra"
                      >
                        {stop.time !== null ? " · " : ""}
                        {String(fuel)} {fuel === 1 ? "crédito" : "créditos"}
                      </i>
                    )}
                  </span>
                )}
              </span>
            </div>
          );
        })}

        {/* Los rótulos de la carta. */}
        <span
          aria-hidden
          className="text-foreground/55 pointer-events-none absolute z-[2] -translate-x-1/2 -translate-y-1/2 text-center text-[10.5px] leading-snug whitespace-nowrap"
          style={{ left: pct(Math.max(TOWER.x, 70), CHART_W), top: pct(TOWER.y + 52, CHART_H) }}
        >
          <b className="text-foreground/80 block text-[10px] font-semibold tracking-[0.16em]">TORRE</b>
          {[source?.label, departedHour === null ? null : `salió ${departedHour}`].filter(Boolean).join(" · ")}
        </span>
        <span
          aria-hidden
          className="text-foreground/55 pointer-events-none absolute z-[2] -translate-x-1/2 -translate-y-1/2 text-center text-[10.5px] leading-snug whitespace-nowrap"
          style={{ left: pct(RESTRICTED.x, CHART_W), top: pct(RESTRICTED.y, CHART_H) }}
        >
          <b className="text-foreground/80 block text-[10px] font-semibold tracking-[0.16em]">ESPACIO RESTRINGIDO</b>
          Tu política · {blocked > 0 ? `${String(blocked)} ${blocked === 1 ? "frenada" : "frenadas"} aquí` : "bajas, habeas data, RNE, horario"}
        </span>
        {waiting && approveFix !== undefined && (
          <span
            aria-hidden
            className="text-warning pointer-events-none absolute z-[2] -translate-x-1/2 -translate-y-1/2 text-[9.5px] font-semibold tracking-[0.16em] whitespace-nowrap"
            style={{ left: pct(approveFix.x + 46, CHART_W), top: pct(approveFix.y - 52, CHART_H) }}
          >
            EN ESPERA
          </span>
        )}

        <div
          className="absolute z-[2] w-32 -translate-x-1/2 text-center"
          style={{ left: `min(${pct(AIRPORT.x, CHART_W)}, calc(100% - 4.25rem))`, top: pct(AIRPORT.y - 14, CHART_H) }}
        >
          <svg aria-hidden viewBox="0 0 30 30" className={cn("mx-auto mb-1.5 size-[30px] fill-none stroke-[1.5]", finished ? "stroke-foreground" : "stroke-foreground/55")}>
            <circle cx="15" cy="15" r="11" />
            <line x1="4" y1="21" x2="26" y2="9" />
          </svg>
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

        {/* Tráfico: dos avionetas lejanas, quietas. */}
        <TopPlane aria-hidden size={12} heading={-12} className="text-foreground/[0.28] absolute z-[1] -translate-x-1/2 -translate-y-1/2" style={{ left: pct(300, CHART_W), top: pct(24, CHART_H) }} />
        <TopPlane aria-hidden size={11} heading={-14} className="text-foreground/[0.28] absolute z-[1] -translate-x-1/2 -translate-y-1/2" style={{ left: pct(860, CHART_W), top: pct(300, CHART_H) }} />

        <span
          aria-hidden
          data-plane={running ? "live" : paused ? "paused" : failed ? "grounded" : waiting ? "holding" : "still"}
          className={cn(
            "absolute z-[4] grid size-[34px] -translate-x-1/2 -translate-y-1/2 place-items-center drop-shadow-[0_0_6px_color-mix(in_srgb,var(--foreground)_35%,transparent)]",
            paused ? "text-foreground/55" : failed ? "text-destructive" : "text-foreground",
          )}
          style={{ left: pct(plane.at.x, CHART_W), top: pct(plane.at.y, CHART_H) }}
        >
          {running && <span className="border-foreground/60 absolute inset-0 rounded-full border-[1.5px] motion-safe:animate-ping motion-reduce:opacity-40" />}
          <TopPlane size={26} heading={plane.heading} />
        </span>
      </div>

      {/* Las cajas de desvío, bajo su rama: en flujo, crecen con su texto y no se pisan ni se salen. */}
      <div className="flex flex-wrap items-start pb-[18px]">
        {branches.map(({ exit }, order) => {
          const left = (centers[order] ?? 0) - EXIT_W / 2;
          const previous = centers[order - 1];
          const gap = left - (previous === undefined ? 0 : previous + EXIT_W / 2);
          return <ExitCard key={exit.at} exit={exit} className="shrink-0" style={{ marginLeft: pct(gap, 1000), width: pct(EXIT_W, 1000) }} />;
        })}
      </div>
    </>
  );
}

/** El avión visto desde arriba (la silueta de la landing), girado a su rumbo. */
function TopPlane({
  size,
  heading,
  className,
  style,
  ...rest
}: { size: number; heading: number; className?: string; style?: React.CSSProperties } & React.AriaAttributes) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={cn("overflow-visible", className)} style={{ ...style, rotate: `${String(heading + 90)}deg` }} {...rest}>
      <path d={TOP_PLANE_PATH} fill="currentColor" />
    </svg>
  );
}

const fmt = (value: number) => String(Math.round(value * 10) / 10);


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
    <ol aria-label="La aerovía de esta salida" className="flex flex-col pt-1.5">
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
              {index === currentIndex && (
                <span aria-hidden data-plane={running ? "live" : "still"} className={cn("bg-background absolute -top-[9px] left-0.5 z-[3] grid size-9 place-items-center rounded-full", paused ? "text-foreground/55" : "text-foreground")}>
                  <TopPlane size={22} heading={90} />
                </span>
              )}
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
          {finished && (
            <span aria-hidden className="bg-background text-foreground absolute -top-[9px] left-0.5 z-[3] grid size-9 place-items-center rounded-full">
              <TopPlane size={22} heading={90} />
            </span>
          )}
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
