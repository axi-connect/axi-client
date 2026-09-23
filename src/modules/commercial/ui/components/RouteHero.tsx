"use client";

import { formatMoney } from "@/core/lib/format";
import type { CommercialPaceDTO, CommercialPlanDTO } from "@/modules/commercial/domain/commercial";
import { paceHeadline, projectionLine } from "@/modules/commercial/domain/copy";
import { formatMillions, formatPct } from "@/modules/commercial/domain/format";
import { PACE_BADGES } from "@/modules/commercial/domain/labels";
import { expectedPct, progressPct } from "@/modules/commercial/domain/pace";
import { weekTicks } from "@/modules/commercial/domain/weeks";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { RouteLine } from "./RouteLine";
import { useEntrance } from "@/modules/commercial/ui/hooks/use-count-up";

/**
 * El hero de la ruta: la cifra grande, la línea y UNA frase con su badge.
 *
 * En «aprendiendo» (`data_sufficiency ≠ ok`) la línea va sin marcador ni
 * proyección: con dos días de datos no se afirma dónde deberías ir. La cifra
 * grande cuenta hacia arriba con el mismo resorte que la línea, una sola vez.
 */
export function RouteHero({ pace, plan }: { pace: CommercialPaceDTO; plan: CommercialPlanDTO | null }) {
  const t = useEntrance();
  const learning = pace.data_sufficiency !== "ok";
  const done = progressPct(pace.actual_revenue_cents, pace.target_revenue_cents);
  const expected = learning ? null : expectedPct(pace.business_days_elapsed, pace.business_days_total) / 100;
  const projected = learning || pace.projected_revenue_cents === null ? null : pace.projected_revenue_cents / pace.target_revenue_cents;
  const sales = pace.key_results.find((kr) => kr.key === "sales");

  const headline = paceHeadline({
    status: learning ? "insufficient_data" : pace.status,
    currency: pace.currency,
    actual_cents: pace.actual_revenue_cents,
    target_cents: pace.target_revenue_cents,
    expected_cents: pace.expected_revenue_cents,
    projected_cents: pace.projected_revenue_cents,
    sales_actual: sales?.actual ?? 0,
    sales_target: sales?.target ?? plan?.figures.needed_sales.value ?? 0,
    days_left: pace.business_days_left,
    days_until_projection: pace.days_until_projection,
  });

  return (
    <section aria-label="La ruta del mes" className="flex flex-col gap-3 rounded-2xl border border-border bg-background px-6 pt-5 pb-4 sm:px-7">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <b
          className="font-heading text-[40px] leading-none font-bold tracking-[-0.025em] tabular-nums sm:text-[46px]"
          aria-label={formatMillions(pace.actual_revenue_cents, pace.currency)}
        >
          {formatMillions(Math.round(pace.actual_revenue_cents * t), pace.currency)}
        </b>
        <span className="text-[15px] text-muted-foreground">
          de {formatMoney(pace.target_revenue_cents, pace.currency)} · {formatPct(done)}
        </span>
      </p>
      <RouteLine
        done={done / 100}
        expected={expected}
        projected={projected}
        projectedLabel={projectionLine(pace.projected_revenue_cents, pace.target_revenue_cents, pace.currency)}
        weeks={weekTicks(pace.period_start, pace.period_end)}
      />
      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[14.5px] leading-[1.45]">
        <StatusBadge status={learning ? "insufficient_data" : pace.status} map={PACE_BADGES} appearance="dot" />
        <span>{headline}</span>
      </p>
    </section>
  );
}
