import { Plane } from "lucide-react";

import { cn } from "@/core/lib/utils";

import type { StopState, Trajectory } from "../../domain/trajectory";

const NODE: Record<StopState, string> = {
  done: "border-foreground bg-foreground",
  now: "border-foreground border-[3px] bg-card",
  wait: "border-warning border-[3px] bg-card shadow-[0_0_0_4px_color-mix(in_srgb,var(--warning)_22%,transparent)]",
  fail: "border-destructive bg-destructive",
  todo: "border-muted-foreground bg-card",
};

/**
 * El recorrido en miniatura de la última ejecución (U2, tarjeta del piloto):
 * las mismas paradas en una fila, con su cifra y, si está volando, el avión en
 * la parada donde va. En una tarjeta estrecha se quitan los nombres (el lector
 * de pantalla los oye siempre).
 */
export function MiniTrajectory({ trajectory, flying }: { trajectory: Trajectory; flying: boolean }) {
  const { stops, currentIndex } = trajectory;
  const reached = stops.reduce((last, stop, index) => (stop.state === "todo" ? last : index), -1);
  const span = stops.length - 1;
  const lineWidth = reached <= 0 || span <= 0 ? 0 : (reached / span) * 100;
  return (
    <div className="@container/mini min-w-0">
      <ol aria-label="Recorrido de la última ejecución" className="relative grid" style={{ gridTemplateColumns: `repeat(${String(stops.length)}, minmax(0, 1fr))` }}>
        {/* Las líneas van de centro a centro: de la primera parada a la última. */}
        <span
          aria-hidden
          className="border-muted-foreground/70 absolute top-[7px] border-t-2 border-dotted"
          style={{ left: `${String(50 / stops.length)}%`, right: `${String(50 / stops.length)}%` }}
        />
        <span
          aria-hidden
          className="bg-foreground absolute top-[6px] h-[3px] rounded-full"
          style={{ left: `${String(50 / stops.length)}%`, width: `${String((lineWidth * (stops.length - 1)) / stops.length)}%` }}
        />
        {stops.map((stop, index) => (
          <li key={stop.key} data-state={stop.state} className="relative flex min-w-0 flex-col items-center gap-1 text-center">
            <span className="sr-only">
              {stop.label}: {stop.count === null ? "aún no llega" : `${String(stop.count)} cuentas`}
            </span>
            <span aria-hidden className={cn("relative z-[1] block size-4 rounded-full border-2", NODE[stop.state])}>
              {flying && index === currentIndex && (
                <Plane className="fill-foreground text-foreground absolute -top-5 left-1/2 size-4 -translate-x-1/2 rotate-45" />
              )}
            </span>
            <span aria-hidden className="font-mono text-xs font-semibold tabular-nums">
              {stop.count === null ? "" : String(stop.count)}
            </span>
            <span aria-hidden className="text-muted-foreground hidden text-[11px] leading-tight text-balance @[34rem]/mini:block">
              {stop.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
