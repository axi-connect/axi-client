import type { CSSProperties } from "react";
import { cn } from "@/core/lib/utils";
import type { DriveModel, OriginGroup, StorageState } from "@/modules/storage/domain/storage";
import { STATE_PILL } from "@/modules/storage/domain/storage";
import { routeModel, ROUTE_HEIGHT, ROUTE_WIDTH, toPoints } from "@/modules/storage/domain/route";
import type { StorageSummaryDTO } from "@/modules/storage/domain/storage";

/**
 * Piezas gráficas de T1 (mockup `drive`, `route`, `meter`). Los orígenes son
 * NEUTROS a propósito —el color es estado, no categoría—: tres mezclas de
 * foreground sobre background, que siguen al tema solas.
 */
export const ORIGIN_FILL: Record<OriginGroup, string> = {
  customers: "color-mix(in srgb, var(--foreground) 88%, var(--background))",
  team: "color-mix(in srgb, var(--foreground) 50%, var(--background))",
  axi: "color-mix(in srgb, var(--foreground) 24%, var(--background))",
};
const FREE_FILL = "color-mix(in srgb, var(--foreground) 5%, var(--background))";

/** La muestra de color de un origen (leyendas). */
export function OriginSwatch({ group, className }: { group: OriginGroup; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2.5 shrink-0 rounded-[3px]", className)}
      style={{ background: ORIGIN_FILL[group] }}
    />
  );
}

/** La muestra de «Libre»: el cuadro punteado del disco. */
export function FreeSwatch() {
  return <span aria-hidden="true" className="border-foreground/30 inline-block size-2.5 shrink-0 rounded-[3px] border-[1.5px] border-dashed" />;
}

const LED_DOT: Record<StorageState, string> = {
  ok: "bg-success ring-success/20",
  warning: "bg-warning ring-warning/20",
  full: "bg-destructive ring-destructive/20",
  unlimited: "bg-success ring-success/20",
};

/**
 * «Tu disco»: un dispositivo ilustrado donde cada cuadro es una porción fija
 * del espacio (1 GB en el aprobado). Es un glifo, no una superficie de datos:
 * las cifras van escritas al lado; el lector de pantalla oye el resumen.
 */
export function DriveGlyph({ model, state, label }: { model: DriveModel; state: StorageState; label: string }) {
  return (
    <figure
      aria-label={label}
      className="border-border relative m-0 rounded-[26px] border bg-linear-to-b from-foreground/5 to-foreground/[0.015] px-4 pt-4 pb-3.5 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_22px_40px_-26px_rgb(0_0_0/0.35)]"
    >
      <div className="text-muted-foreground mb-3 flex items-center justify-between text-[11px] font-medium tracking-[0.08em] uppercase">
        <span className="inline-flex items-center gap-1.5" title={STATE_PILL[state].led}>
          <span aria-hidden="true" className={cn("size-[7px] rounded-full ring-[3px]", LED_DOT[state])} />
          Tu disco
        </span>
        <span className="font-heading text-foreground text-[13px] tracking-tight normal-case">{model.caption}</span>
      </div>
      <div aria-hidden="true" className="grid grid-cols-5 gap-1.5">
        {model.cells.map((stops, index) =>
          stops === null ? (
            <span key={index} className="border-foreground/20 aspect-[1.55] rounded-[9px] border-[1.5px] border-dashed" />
          ) : (
            <span key={index} className="ring-foreground/6 aspect-[1.55] rounded-[9px] ring-1 ring-inset" style={cellStyle(stops)} />
          ),
        )}
      </div>
      <figcaption className="text-muted-foreground mt-3 flex items-center justify-between text-[11.5px]">
        <span aria-hidden="true" className="flex gap-[3px]">
          {[0, 1, 2, 3].map((bar) => (
            <i key={bar} className="bg-foreground/14 block h-[3px] w-3.5 rounded-sm" />
          ))}
        </span>
        <span>{model.unitCaption}</span>
      </figcaption>
    </figure>
  );
}

function cellStyle(stops: NonNullable<DriveModel["cells"][number]>): CSSProperties {
  const parts = stops.map((stop) => `${ORIGIN_FILL[stop.group]} ${stop.from.toFixed(0)}% ${stop.to.toFixed(0)}%`);
  const last = stops[stops.length - 1];
  if (last.to < 100) parts.push(`${FREE_FILL} ${last.to.toFixed(0)}% 100%`);
  return { background: `linear-gradient(90deg, ${parts.join(", ")})` };
}

/** Medidor de la cuota con la marca del 80 %. El tono sale del estado, no del %. */
export function StorageMeter({ pct, state, className }: { pct: number; state: StorageState; className?: string }) {
  const fill = state === "full" ? "bg-destructive" : state === "warning" ? "bg-warning" : "bg-foreground";
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div
      role="progressbar"
      aria-label="Espacio usado"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn("bg-muted relative h-2 rounded-full", className)}
    >
      <span className={cn("absolute inset-y-0 left-0 rounded-full", fill)} style={{ width: `${clamped}%` }} />
      <span aria-hidden="true" className="bg-background ring-border absolute -top-[3px] -bottom-[3px] w-0.5 rounded-sm ring-1" style={{ left: "80%" }} />
    </div>
  );
}

/**
 * «Tu ritmo»: lo recorrido (línea llena), hoy (punto hueco) y la proyección
 * punteada hasta el tope, con su mes. `null` sin cuota o sin serie.
 */
export function PaceRoute({ summary }: { summary: StorageSummaryDTO }) {
  const model = routeModel(summary);
  if (model === null) return null;
  return (
    <svg viewBox={`0 0 ${ROUTE_WIDTH} ${ROUTE_HEIGHT}`} aria-hidden="true" className="block h-auto w-full overflow-visible">
      <line x1={0} x2={ROUTE_WIDTH} y1={model.capY} y2={model.capY} className="stroke-foreground/30" strokeWidth={1.2} strokeDasharray="2 4" />
      <text x={0} y={model.capY - 5} className="fill-muted-foreground text-[10.5px]">
        {model.capLabel}
      </text>
      <polygon points={toPoints(model.area)} className="fill-foreground/6" />
      <polyline
        points={toPoints(model.done)}
        className="stroke-foreground fill-none"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {model.projection ? (
        <>
          <polyline
            points={toPoints([model.now, model.projection.to])}
            className="stroke-muted-foreground fill-none"
            strokeWidth={1.8}
            strokeDasharray="4 5"
            strokeLinecap="round"
          />
          {model.projection.reachesCap ? (
            <>
              <circle cx={model.projection.to.x} cy={model.projection.to.y} r={4} className="fill-warning" />
              <text
                x={model.projection.to.x - 2}
                y={model.projection.to.y - 9}
                textAnchor="end"
                className="fill-foreground text-[10.5px] font-medium"
              >
                {model.projection.label}
              </text>
            </>
          ) : null}
        </>
      ) : null}
      <circle cx={model.now.x} cy={model.now.y} r={5} className="fill-background stroke-foreground" strokeWidth={2.2} />
      {model.labels.map((label) => (
        <text key={`${label.text}-${label.x}`} x={label.x} y={ROUTE_HEIGHT - 4} textAnchor="middle" className="fill-muted-foreground text-[10.5px]">
          {label.text}
        </text>
      ))}
    </svg>
  );
}
