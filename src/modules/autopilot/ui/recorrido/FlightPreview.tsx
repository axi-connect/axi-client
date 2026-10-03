import { cn } from "@/core/lib/utils";
import { Kicker } from "@/shared/components/features/bento";
import { Island } from "@/shared/components/features/island";

import type { Estimate } from "../../domain/autopilot";
import type { PreviewStop } from "../../domain/copy";
import { flowWidth } from "./geometry";

/** Las paradas que llegan con todas las cuentas: antes de calificar no se pierde ninguna. */
const BEFORE_QUALIFY = new Set(["search", "enrich"]);

/**
 * «Así sale tu piloto» (R3): una frase con lo que trae y a cuántas les escribe
 * (del estimado), el mismo carril de la aerovía en vertical con las cifras que
 * estima el servidor, y el estimado (`POST /autopilot/estimate`). No pide nada
 * nuevo: lee el borrador y la estimación que ya existen.
 */
export function FlightPreview({
  headline,
  stops,
  leadsPerRun,
  estimate,
  className,
}: {
  headline: string;
  stops: readonly PreviewStop[];
  leadsPerRun: number;
  estimate: Estimate | null;
  className?: string;
}) {
  const revealed = estimate === null ? null : Math.round(estimate.leads_revealed_per_run);
  const countOf = (key: string) => (BEFORE_QUALIFY.has(key) ? String(leadsPerRun) : revealed === null ? "—" : `~${String(revealed)}`);
  const widthOf = (key: string) =>
    Math.max(4, flowWidth(BEFORE_QUALIFY.has(key) ? leadsPerRun : (revealed ?? 0), Math.max(1, leadsPerRun)) * 0.8);
  return (
    <Island as="aside" aria-label="Así sale tu piloto" className={cn("flex min-w-0 flex-col p-[22px]", className)}>
      <Kicker>Así sale tu piloto</Kicker>
      <p className="font-heading mt-2 text-[22px] leading-tight font-bold tracking-[-0.02em] text-pretty" aria-live="polite">
        {headline}
      </p>
      <ol className="mt-3 flex flex-col">
        {stops.map((stop, index) => {
          const last = index === stops.length - 1;
          return (
            <li key={stop.key} className="relative grid min-h-11 grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-x-2.5">
              <span aria-hidden className="relative flex justify-center self-stretch">
                {!last && (
                  <span
                    className="absolute top-2.5 -bottom-2.5 rounded-full bg-[linear-gradient(180deg,var(--axi-brand),var(--axi-brand-2))]"
                    style={{ width: widthOf(stops[index + 1]?.key ?? stop.key) }}
                  />
                )}
                <span className={cn("bg-foreground border-foreground relative z-[1] mt-[3px] block size-4 border-2", stop.gate ? "scale-90 rotate-45 rounded-[4px]" : "rounded-full")} />
              </span>
              <span className="min-w-0">
                <b className="block text-[13.5px] font-medium">{stop.label}</b>
                <span className="text-muted-foreground block text-xs text-pretty break-words">{stop.detail}</span>
              </span>
              <span className="font-heading text-[17px] leading-[1.1] font-bold tabular-nums">{countOf(stop.key)}</span>
            </li>
          );
        })}
      </ol>
      <div className="border-foreground/10 mt-3 flex flex-col gap-1 border-t pt-3" aria-live="polite">
        <span className="text-muted-foreground text-xs">Estimado del servidor</span>
        {estimate === null ? (
          <span className="text-muted-foreground text-sm text-pretty">Completa el piloto para ver cuánto gastaría.</span>
        ) : (
          <>
            <span className="font-heading mt-1 flex flex-wrap items-baseline gap-x-1.5 text-[30px] leading-none font-bold tabular-nums">
              ~{String(estimate.credits_per_month)}
              <span className="font-sans text-sm font-medium tracking-normal">créditos al mes</span>
            </span>
            <span className="text-muted-foreground mt-1 text-xs text-pretty">
              {String(estimate.runs_per_month)} salidas · hasta {String(estimate.credits_per_run)} créditos por salida ·{" "}
              {String(Math.round(estimate.leads_revealed_per_run))} cuentas reveladas por salida
            </span>
          </>
        )}
      </div>
    </Island>
  );
}
