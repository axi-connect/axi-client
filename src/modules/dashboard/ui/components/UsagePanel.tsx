"use client";

import { formatInteger } from "@/core/lib/commercial-units";
import {
  HIGHLIGHTED_USAGE_METRICS,
  USAGE_METRIC_LABELS,
  type UsageSummaryDTO,
} from "@/modules/dashboard/domain/dashboard";
import type { Section } from "@/modules/dashboard/infrastructure/stores/dashboard.store";
import { TileError, TileSkeleton, UsageMeter } from "@/modules/dashboard/ui/components/parts";
import { BentoTile } from "@/shared/components/features/bento";

/**
 * «ciclo 1 – 30 sept»: el ciclo de facturación, en corto y en la zona del
 * negocio. La ventana es `[inicio, fin)` (billing_cycle.port del servidor):
 * un milisegundo antes del fin es el último día; los bordes son medianoches
 * del negocio, que en UTC caen en otro día.
 */
export function cycleLabel(start: string, end: string, timeZone?: string): string {
  const s = new Date(start);
  const e = new Date(new Date(end).getTime() - 1);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "";
  const part = (d: Date, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-CO", { ...opts, timeZone }).format(d).replace(".", "");
  const day = (d: Date) => part(d, { day: "numeric" });
  const month = (d: Date) => part(d, { month: "short" });
  return month(s) === month(e)
    ? `ciclo ${day(s)} – ${day(e)} ${month(e)}`
    : `ciclo ${day(s)} ${month(s)} – ${day(e)} ${month(e)}`;
}

/**
 * ¿Cuánto plan he consumido? — GET /usage/summary (ciclo de facturación: no
 * cambia con el período). Una barra por métrica legible con la marca del
 * 80 %; el tono se pone en la barra solo al pasarla. Abajo, el costo del ciclo.
 */
export function UsagePanel({
  section,
  timeZone,
  onRetry,
  className,
}: {
  section: Section<UsageSummaryDTO>;
  timeZone?: string;
  onRetry: () => Promise<void>;
  className?: string;
}) {
  const label = "Consumo del plan";
  if (section.status === "error") {
    return <TileError label={label} message={section.error ?? "No se pudo cargar el consumo."} onRetry={onRetry} className={className} />;
  }
  if (section.data === null) return <TileSkeleton label={label} lines={3} className={className} />;

  const summary = section.data;
  const highlighted = summary.metrics.filter(
    (metric) =>
      (HIGHLIGHTED_USAGE_METRICS as readonly string[]).includes(metric.metric) ||
      // La voz es opcional y de pago: se destaca solo cuando el tenant la
      // tiene contratada (límite propio) o ya consumió en el ciclo
      (metric.metric === "tts_characters" && (metric.limit !== null || metric.used > 0)),
  );
  const cycle = cycleLabel(summary.period_start, summary.period_end, timeZone);
  const hasLimits = highlighted.some((metric) => metric.limit !== null);

  return (
    <BentoTile
      label={label}
      aside={cycle ? <span className="text-muted-foreground text-xs whitespace-nowrap">{cycle}</span> : undefined}
      className={className}
    >
      {highlighted.length === 0 ? (
        <p className="text-muted-foreground text-sm text-pretty">Sin consumo registrado este ciclo.</p>
      ) : (
        <ul className="flex flex-col gap-4 pt-1">
          {highlighted.map((metric) => {
            const limit = metric.limit?.value ?? null;
            return (
              <li key={metric.metric} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm">{USAGE_METRIC_LABELS[metric.metric] ?? metric.metric}</span>
                  <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap tabular-nums">
                    <b className="text-foreground font-semibold">{formatInteger(metric.used)}</b>
                    {limit !== null ? ` de ${formatInteger(limit)}` : " · sin límite"}
                  </span>
                </div>
                {limit !== null ? <UsageMeter pct={metric.limit?.pct_used ?? 0} /> : null}
              </li>
            );
          })}
        </ul>
      )}
      {hasLimits ? (
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <span aria-hidden="true" className="bg-foreground/35 h-3 w-0.5 rounded-full" />
          La marca es el 80 % del límite
        </p>
      ) : null}
      <div className="border-border mt-auto flex items-baseline justify-between gap-3 border-t pt-3.5">
        <span className="text-muted-foreground text-sm">Costo del ciclo</span>
        <span className="text-[0.95rem] font-semibold whitespace-nowrap tabular-nums">
          $ {summary.cost.used_usd.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
          <span className="text-muted-foreground text-xs font-normal">USD</span>
        </span>
      </div>
    </BentoTile>
  );
}
