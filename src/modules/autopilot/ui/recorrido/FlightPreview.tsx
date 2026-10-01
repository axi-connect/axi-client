import { cn } from "@/core/lib/utils";
import { Kicker } from "@/shared/components/features/bento";
import { Island } from "@/shared/components/features/island";

import type { Estimate } from "../../domain/autopilot";
import type { previewStops } from "../../domain/copy";

/**
 * «Así vuela tu piloto» (U3): el recorrido armado con lo que vas eligiendo en
 * el editor —cada decisión cae en su parada— y la estimación del servidor
 * (`POST /autopilot/estimate`, la misma de la sección 6). No pide nada nuevo.
 */
export function FlightPreview({
  stops,
  estimate,
  className,
}: {
  stops: ReturnType<typeof previewStops>;
  estimate: Estimate | null;
  className?: string;
}) {
  return (
    <Island as="aside" aria-label="Así vuela tu piloto" className={cn("flex min-w-0 flex-col gap-4 p-5", className)}>
      <Kicker>Así vuela tu piloto</Kicker>
      <ol className="flex flex-col">
        {stops.map((stop, index) => (
          <li key={stop.key} className="relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 pb-4 last:pb-0">
            {index < stops.length - 1 && <span aria-hidden className="bg-foreground absolute top-4 bottom-0 left-[11px] w-0.5" />}
            <span
              aria-hidden
              className={cn(
                "bg-foreground relative z-[1] mx-1 mt-1 block size-3.5",
                stop.gate ? "rotate-45 rounded-[3px]" : "rounded-full",
              )}
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-semibold">{stop.label}</span>
              <span className="text-muted-foreground text-xs text-pretty break-words">{stop.detail}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="border-border flex flex-col gap-1 border-t pt-4" aria-live="polite">
        <span className="text-muted-foreground text-xs">Estimado del servidor</span>
        {estimate === null ? (
          <span className="text-muted-foreground text-sm text-pretty">Completa el piloto para ver cuánto gastaría.</span>
        ) : (
          <>
            <span className="font-heading text-2xl leading-tight font-bold tabular-nums">~{String(estimate.credits_per_month)} créditos al mes</span>
            <span className="text-muted-foreground text-xs text-pretty">
              {String(estimate.runs_per_month)} ejecuciones · hasta {String(estimate.credits_per_run)} por ejecución ·{" "}
              {String(Math.round(estimate.leads_revealed_per_run))} cuentas reveladas por ejecución
            </span>
          </>
        )}
      </div>
    </Island>
  );
}
