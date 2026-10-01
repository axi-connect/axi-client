import { Plane } from "lucide-react";

import { cn } from "@/core/lib/utils";

import type { StopState, Trajectory } from "../../domain/trajectory";

const NODE: Record<StopState, string> = {
  done: "border-foreground bg-foreground",
  now: "border-brand bg-card shadow-[0_0_0_4px_color-mix(in_srgb,var(--axi-brand)_20%,transparent)]",
  wait: "border-warning bg-card shadow-[0_0_0_4px_color-mix(in_srgb,var(--axi-warning)_22%,transparent)]",
  fail: "border-destructive bg-destructive",
  todo: "border-foreground/40 bg-card",
};

/** Dónde va el avión en el tramo hacia la parada actual: al 72 %. */
const PLANE_AT = 0.72;

/**
 * La ruta de la última salida en línea recta (tarjeta de la lista, la
 * distribución que eligió el dueño): nodos de 16 px con su cifra y su nombre,
 * sólida hasta la última parada alcanzada y punteada después, y el avión de
 * lucide en su tramo si la salida va en ruta, espera o está pausada (late solo
 * en ruta). En una tarjeta de menos de 620 px se quitan los nombres; el lector
 * de pantalla los oye siempre.
 */
export function MiniTrajectory({ trajectory, running, showPlane }: { trajectory: Trajectory; running: boolean; showPlane: boolean }) {
  const { stops, currentIndex } = trajectory;
  const n = stops.length;
  const at = (index: number) => (n > 1 ? (index / (n - 1)) * 100 : 0);
  const reached = stops.reduce((last, stop, index) => (stop.state === "todo" ? last : index), -1);
  const current = Math.min(currentIndex, n - 1);
  const planeAt = showPlane && current >= 0 ? (current === 0 ? 0 : at(current - 1) + (at(current) - at(current - 1)) * PLANE_AT) : null;
  const speech = stops.map((stop) => `${stop.label} ${stop.count === null ? "aún no llega" : String(stop.count)}`).join(", ");

  return (
    <div className="@container/line min-w-0">
      <div role="img" aria-label={`Ruta de la última salida: ${speech}`} className="relative mx-3 mt-1 h-[42px] @[38.75rem]/line:mx-10 @[38.75rem]/line:h-[62px]">
        <span aria-hidden className="border-foreground/30 absolute inset-x-0 top-[7px] border-t-2 border-dotted" />
        <span aria-hidden className="bg-foreground absolute top-1.5 left-0 h-[3px] rounded-full" style={{ width: `${String(reached < 0 ? 0 : at(reached))}%` }} />
        <ol aria-hidden>
          {stops.map((stop, index) => (
            <li
              key={stop.key}
              data-state={stop.state}
              className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-[3px] @[38.75rem]/line:w-[110px]"
              style={{ left: `${String(at(index))}%` }}
            >
              <i className={cn("block size-4 border-2", stop.gate ? "scale-[0.85] rotate-45 rounded-[4px]" : "rounded-full", NODE[stop.state])} />
              <b className={cn("min-h-3.5 text-[13px] leading-[1.1] font-semibold tabular-nums", stop.count === null && "text-muted-foreground font-normal")}>
                {stop.count === null ? "" : String(stop.count)}
              </b>
              <small className="text-muted-foreground hidden text-[11.5px] whitespace-nowrap @[38.75rem]/line:block">{stop.label}</small>
            </li>
          ))}
        </ol>
        {planeAt !== null && (
          <span
            aria-hidden
            data-plane={running ? "live" : "still"}
            className="bg-card text-foreground absolute -top-0.5 grid size-6 -translate-x-1/2 place-items-center rounded-full"
            style={{ left: `${String(planeAt)}%` }}
          >
            {running && <span className="border-brand absolute -inset-0.5 rounded-full border-[1.5px] motion-safe:animate-ping motion-reduce:opacity-40" />}
            <Plane className="size-[18px] rotate-45" />
          </span>
        )}
      </div>
    </div>
  );
}
