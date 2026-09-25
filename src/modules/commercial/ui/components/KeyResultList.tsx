"use client";

import { formatMoney } from "@/core/lib/format";
import { formatInteger } from "@/core/lib/commercial-units";
import type { CommercialPaceDTO, CommercialPlanDTO, KeyResultKey } from "@/modules/commercial/domain/commercial";
import { missingLine, rateLine } from "@/modules/commercial/domain/copy";
import { formatPct, monthLabel } from "@/modules/commercial/domain/format";
import { KR_LABELS, KR_ORDER } from "@/modules/commercial/domain/labels";
import { progressPct } from "@/modules/commercial/domain/pace";
import { KeyResultRow } from "./KeyResultRow";
import { SourceMark } from "./SourceMark";

export type KeyResultDetailHref = (key: KeyResultKey | "avg_ticket") => string;

/**
 * «RESULTADOS CLAVE»: los OKR derivados de la meta (D8), en el orden del plan
 * (ventas, ticket, cotizaciones, citas, contactados, conversaciones nuevas,
 * llamadas). Es una lista agrupada, no una tabla: etiqueta → valor, una línea
 * secundaria, un solo indicador. El mix de productos va como segunda línea de
 * «Ventas» y no como fila propia.
 *
 * En «aprendiendo» las filas no afirman ritmo: solo camino recorrido y de
 * dónde sale la meta de cada una. Con `detailHref` cada fila abre su detalle
 * (`/comercial/resultados/[key]`, hoja interceptada).
 */
export function KeyResultList({
  pace,
  plan,
  learning = false,
  detailHref,
}: {
  pace: CommercialPaceDTO;
  plan: CommercialPlanDTO | null;
  learning?: boolean;
  detailHref?: KeyResultDetailHref;
}) {
  const niche = plan?.benchmark_niche_label ?? null;
  const byKey = new Map(pace.key_results.map((kr) => [kr.key, kr]));
  const month = monthLabel(pace.period_start);
  const mix = plan?.product_mix.slice(0, 3) ?? [];
  const mixLine = mix.length > 0 ? `Mix sugerido: ${mix.map((row) => `${formatPct(row.share_pct)} ${row.category}`).join(" · ")}` : null;
  const ticket = plan?.inputs.avg_ticket_cents ?? null;

  return (
    <section
      aria-labelledby="commercial-krs"
      className="overflow-hidden rounded-2xl border border-border bg-background shadow-float"
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 pt-3.5 pb-1">
        <h2 id="commercial-krs" className="text-[11.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Resultados clave
        </h2>
        <p className="text-[12px] text-muted-foreground">
          Objetivo: vender {formatMoney(pace.target_revenue_cents, pace.currency)} en {month}
        </p>
      </header>
      <ul className="grouped-list rounded-none">
        {KR_ORDER.flatMap((key) => {
          const kr = byKey.get(key);
          if (kr === undefined) return [];
          const row = (
            <KeyResultRow
              key={key}
              href={detailHref?.(key)}
              label={KR_LABELS[key]}
              value={missingLine(kr.actual, kr.target)}
              secondary={
                learning ? (
                  <SourceMark source={kr.source} nicheLabel={niche} />
                ) : (
                  <>
                    <span>{rateLine(kr.daily_rate_actual, kr.daily_rate_expected, kr.source, niche).replace(/ · [^·]+$/, "")}</span>
                    <span aria-hidden>·</span>
                    <SourceMark source={kr.source} nicheLabel={niche} />
                  </>
                )
              }
              extra={
                key === "sales"
                  ? learning
                    ? "Aún sin historia para medir el ritmo."
                    : mixLine
                  : key === "calls" && kr.answered_actual !== null
                    ? `Contestadas ${formatInteger(kr.answered_actual)}${kr.answered_expected !== null ? ` de ${formatInteger(kr.answered_expected)}` : ""}`
                    : undefined
              }
              pct={progressPct(kr.actual, kr.target)}
              status={learning ? null : kr.status}
            />
          );
          if (key !== "sales" || ticket === null) return [row];
          const actualTicket = pace.avg_ticket_actual_cents;
          return [
            row,
            <KeyResultRow
              key="avg_ticket"
              href={detailHref?.("avg_ticket")}
              label="Ticket promedio"
              value={
                actualTicket !== null ? (
                  <>
                    {formatMoney(actualTicket, pace.currency)}{" "}
                    <span className="font-normal text-muted-foreground">plan {formatMoney(ticket.value, pace.currency)}</span>
                  </>
                ) : (
                  formatMoney(ticket.value, pace.currency)
                )
              }
              secondary={
                <>
                  <SourceMark source={ticket.source} nicheLabel={niche} />
                  {ticket.window_days !== null ? <span>· últimos {ticket.window_days} días</span> : null}
                  {ticket.sample !== null ? <span>· {ticket.sample} ventas</span> : null}
                </>
              }
              pct={actualTicket !== null ? progressPct(actualTicket, ticket.value) : 0}
            />,
          ];
        })}
      </ul>
    </section>
  );
}
