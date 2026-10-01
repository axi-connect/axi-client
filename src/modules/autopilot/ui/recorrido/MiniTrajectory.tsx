import { useId } from "react";

import { cn } from "@/core/lib/utils";

import type { StopState, Trajectory } from "../../domain/trajectory";
import { AxiCoin } from "./AxiCoin";
import { cubicPath, flowWidth, pct, segmentCubic, splitCubic, type Point } from "./geometry";

const VW = 1000;
const VH = 60;

const NODE: Record<StopState, string> = {
  done: "border-foreground bg-foreground",
  now: "border-brand bg-card",
  wait: "border-warning bg-card",
  fail: "border-destructive bg-card",
  todo: "border-foreground/35 bg-card",
};

/**
 * La ruta en miniatura de la última salida (R2, tarjeta de la ruta): el mismo
 * grosor que el mapa (tan gruesa como las cuentas que pasan), punteada lo que
 * falta y Axi en su tramo si va en ruta o espera. Las etiquetas son HTML: no
 * escalan con el SVG. En una tarjeta estrecha se quitan los nombres; el lector
 * de pantalla los oye siempre.
 */
export function MiniTrajectory({ trajectory, running, maxFlow }: { trajectory: Trajectory; running: boolean; maxFlow: number }) {
  const gradient = useId();
  const { stops, currentIndex } = trajectory;
  const n = stops.length;
  const step = n > 1 ? (988 - 12) / (n - 1) : 0;
  const points: Point[] = stops.map((_, index) => ({ x: 12 + index * step, y: 30 + 7 * Math.sin(index * 1.1 + 0.4) }));
  const current = stops[currentIndex];
  const axiShown = current !== undefined && (current.state === "now" || current.state === "wait");
  const axi = (() => {
    if (!axiShown) return null;
    const from = points[currentIndex - 1];
    const to = points[currentIndex];
    if (to === undefined) return null;
    return from === undefined ? to : splitCubic(segmentCubic(from, to), 0.78)[0][3];
  })();
  const speech = stops.map((stop) => `${stop.label} ${stop.count === null ? "aún no llega" : String(stop.count)}`).join(", ");

  return (
    <div className="@container/mini min-w-0">
      <div role="img" aria-label={`Ruta de la última salida: ${speech}`} className="relative mx-2 h-[92px]">
        <div className="absolute inset-x-0 top-3.5 h-[60px]">
          <svg aria-hidden viewBox={`0 0 ${String(VW)} ${String(VH)}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            <defs>
              <linearGradient id={gradient} x1="0" x2="1">
                <stop offset="0" stopColor="var(--axi-brand)" />
                <stop offset="1" stopColor="var(--axi-brand-2)" />
              </linearGradient>
            </defs>
            {points.slice(1).map((to, index) => {
              const from = points[index] ?? to;
              const next = stops[index + 1];
              const d = cubicPath(segmentCubic(from, to));
              return next !== undefined && next.state !== "todo" ? (
                <path
                  key={index}
                  d={d}
                  fill="none"
                  stroke={`url(#${gradient})`}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  strokeWidth={flowWidth(next.count, maxFlow) * 0.6 + 0.5}
                />
              ) : (
                <path key={index} d={d} fill="none" strokeDasharray="2 6" vectorEffect="non-scaling-stroke" strokeWidth={1.5} className="stroke-foreground/35" />
              );
            })}
          </svg>
          {stops.map((stop, index) => {
            const point = points[index] ?? { x: 0, y: 0 };
            const edge = index === 0 ? "left-[-4px] translate-x-0" : index === n - 1 ? "right-[-4px] left-auto translate-x-0" : "left-1/2 -translate-x-1/2";
            return (
              <span
                key={stop.key}
                aria-hidden
                data-state={stop.state}
                className="absolute size-3 -translate-x-1/2 -translate-y-1/2"
                style={{ left: pct(point.x, VW), top: pct(point.y, VH) }}
              >
                <i className={cn("block size-3 border-2", stop.gate ? "scale-90 rotate-45 rounded-[3px]" : "rounded-full", NODE[stop.state])} />
                <em
                  className={cn(
                    "absolute bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 leading-none not-italic tabular-nums",
                    stop.count === null ? "text-muted-foreground text-[13px]" : "font-heading text-base font-bold",
                  )}
                >
                  {stop.count === null ? "—" : String(stop.count)}
                </em>
                <small className={cn("text-muted-foreground absolute top-[calc(100%+5px)] hidden text-[11.5px] whitespace-nowrap @[40rem]/mini:block", edge)}>
                  {stop.label}
                </small>
              </span>
            );
          })}
          {axi !== null && (
            <AxiCoin
              size={28}
              live={running}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: pct(axi.x, VW), top: pct(axi.y, VH) }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
