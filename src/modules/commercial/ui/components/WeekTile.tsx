"use client";

import Link from "next/link";

import { formatInteger } from "@/core/lib/commercial-units";
import { cn } from "@/core/lib/utils";
import type { CommercialPaceDTO } from "@/modules/commercial/domain/commercial";
import { formatRate } from "@/modules/commercial/domain/format";
import { weekChart } from "@/modules/commercial/domain/route-figures";
import { weekProgress } from "@/modules/commercial/domain/weeks";
import { BentoFigure, BentoTile, StatePill } from "@/shared/components/features/bento";

const CHART_PX = 72;

/**
 * «Ritmo · esta semana» (canvas 1, bento): las ventas de la semana contra las
 * esperadas, una barra por día hábil y la raya de lo esperado al día. La serie
 * del servidor es ACUMULADA y «hoy» y los días hábiles los manda él: el
 * navegador no decide qué día es. La ficha entera abre el detalle de ventas.
 *
 * No se pinta si la serie no tiene ningún punto de la semana (como antes la
 * línea del ritmo).
 */
export function WeekTile({
  pace,
  href,
  className,
}: {
  pace: Pick<CommercialPaceDTO, "series" | "today" | "weekdays" | "period_start" | "period_end" | "key_results">;
  href: string;
  className?: string;
}) {
  const week = weekProgress(pace.series, pace.today, pace.weekdays, pace.period_start);
  const chart = weekChart(pace.series, pace.today, pace.weekdays, pace.period_start, pace.period_end);
  if (week === null || chart === null) return null;

  const perDay = week.business_days > 0 ? week.sales / week.business_days : 0;
  const expectedPerDay = pace.key_results.find((kr) => kr.key === "sales")?.daily_rate_expected ?? 0;
  const salesLabel = week.sales === 1 ? "venta" : "ventas";
  const good = week.expected_sales > 0 && week.sales >= week.expected_sales;
  // La escala deja aire sobre el día más alto y sobre la raya de lo esperado.
  const top = Math.max(1, expectedPerDay, ...chart.bars.map((bar) => bar.sales ?? 0)) * 1.15;
  const ariaLabel = `Ritmo de esta semana: ${formatInteger(week.sales)} ${salesLabel}, esperadas ${formatInteger(week.expected_sales)}, ${formatRate(perDay)} al día. Abre el detalle de ventas`;

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cn(
        "group block min-w-0 rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <BentoTile
        label="Ritmo · esta semana"
        aside={good ? <StatePill tone="success">Al ritmo</StatePill> : <span className="text-xs whitespace-nowrap text-muted-foreground">{chart.range}</span>}
        className="h-full transition-colors group-hover:border-foreground/20"
      >
        <div className="flex flex-wrap items-baseline gap-x-2">
          <BentoFigure value={formatInteger(week.sales)} unit={`${salesLabel} de ${formatInteger(week.expected_sales)} esperadas`} />
        </div>

        <div aria-hidden className="relative mt-1 grid auto-cols-fr grid-flow-col items-end gap-2.5" style={{ height: CHART_PX + 20 }}>
          {expectedPerDay > 0 ? (
            <span
              className="absolute inset-x-0 border-t-[1.5px] border-dashed border-foreground/40"
              style={{ bottom: 20 + (expectedPerDay / top) * CHART_PX }}
            />
          ) : null}
          {chart.bars.map((bar) => {
            const height = bar.sales === null ? 4 : Math.max(bar.sales > 0 ? 6 : 3, (bar.sales / top) * CHART_PX);
            return (
              <span key={bar.date} className="flex min-w-0 flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "block w-full max-w-[22px] rounded-md",
                    bar.sales === null ? "bg-muted" : bar.today ? "bg-brand" : bar.sales === 0 ? "bg-foreground/25" : "bg-foreground",
                  )}
                  style={{ height }}
                />
                <span className={cn("text-[11px] leading-none", bar.today ? "font-medium text-foreground" : "text-muted-foreground")}>{bar.letter}</span>
              </span>
            );
          })}
        </div>

        <p className="text-[12.5px] text-muted-foreground tabular-nums">
          {`${formatRate(perDay)} al día${expectedPerDay > 0 ? ` · la línea es lo esperado (${formatRate(expectedPerDay)})` : ""}`}
        </p>
      </BentoTile>
    </Link>
  );
}
