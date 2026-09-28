"use client";

import Link from "next/link";

import { formatInteger } from "@/core/lib/commercial-units";
import { formatMoney } from "@/core/lib/format";
import { cn } from "@/core/lib/utils";
import type { CommercialPaceDTO, CommercialPlanDTO } from "@/modules/commercial/domain/commercial";
import { formatRate } from "@/modules/commercial/domain/format";
import { ratioPct } from "@/modules/commercial/domain/pace";
import { BentoFigure, BentoTile, StatePill } from "@/shared/components/features/bento";
import { SourceMark } from "./SourceMark";

/** Dentro de ±5 % del ticket del plan se está «en plan». */
const ON_PLAN_BAND_PCT = 5;

/**
 * «Ticket promedio» (canvas 1, bento): el real del mes contra el del plan,
 * con cuánto se desvía y de dónde sale el del plan. Era la fila bajo
 * «Ventas» de la lista de resultados; aquí es su ficha y abre el mismo
 * detalle. Sin ticket en el plan no hay ficha (como no había fila).
 */
export function TicketTile({
  pace,
  plan,
  href,
  className,
}: {
  pace: Pick<CommercialPaceDTO, "avg_ticket_actual_cents" | "currency">;
  plan: CommercialPlanDTO | null;
  href: string;
  className?: string;
}) {
  const planned = plan?.inputs.avg_ticket_cents ?? null;
  if (planned === null) return null;
  const actual = pace.avg_ticket_actual_cents;
  const niche = plan?.benchmark_niche_label ?? null;
  const ratio = actual === null ? null : ratioPct(actual, planned.value);
  const deviation = ratio === null ? null : ratio - 100;
  const value = actual === null ? "Sin ventas aún" : formatMoney(actual, pace.currency);

  return (
    <Link
      href={href}
      className={cn(
        "group block min-w-0 rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <BentoTile
        label="Ticket promedio"
        aside={
          deviation === null ? null : Math.abs(deviation) <= ON_PLAN_BAND_PCT ? (
            <StatePill tone="success">En plan</StatePill>
          ) : deviation < 0 ? (
            <StatePill tone="warning">Por debajo del plan</StatePill>
          ) : (
            <StatePill tone="success">Por encima del plan</StatePill>
          )
        }
        className="h-full transition-colors group-hover:border-foreground/20"
      >
        {/* Una cifra de 11+ caracteres («$ 12.500.000») baja un escalón: no se sale de la ficha. */}
        <BentoFigure value={value} size={value.length > 11 ? "md" : "lg"} />
        <p className="text-[13px] text-muted-foreground tabular-nums">
          Plan <b className="font-medium text-foreground">{formatMoney(planned.value, pace.currency)}</b>
          {deviation === null
            ? null
            : deviation === 0
              ? " · justo en el plan"
              : ` · vas un ${formatRate(Math.abs(deviation), 1)} % por ${deviation > 0 ? "encima" : "debajo"}`}
        </p>
        <p className="mt-auto flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          <SourceMark source={planned.source} nicheLabel={niche} />
          {planned.window_days !== null ? <span>· últimos {formatInteger(planned.window_days)} días</span> : null}
          {planned.sample !== null ? <span>· {formatInteger(planned.sample)} ventas</span> : null}
        </p>
      </BentoTile>
    </Link>
  );
}
