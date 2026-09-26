"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { formatMoney } from "@/core/lib/format";
import { StatePill, type StatePillTone } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { type DealDTO, type DealStatus } from "@/modules/crm/domain/deal";
import { formatCloseDate } from "@/modules/crm/domain/pipeline-summary";

const STATUS_TONE: Record<DealStatus, StatePillTone> = { open: "neutral", won: "success", lost: "destructive" };
const STATUS_TEXT: Record<DealStatus, string> = { open: "Abierta", won: "Ganada", lost: "Perdida" };

/**
 * Oportunidades del contacto (`GET /crm/deals?contact_id=`): cada fila abre
 * el rail del deal; "Nueva oportunidad" abre el modal del pipeline con el
 * contacto preseleccionado.
 */
export function ContactDealsCard({
  deals,
  contact,
}: {
  deals: DealDTO[];
  contact: { id: string; label: string };
}) {
  const createHref = `/crm/pipeline/create?contact_id=${contact.id}&contact_label=${encodeURIComponent(contact.label)}`;

  return (
    <section className="rounded-3xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-lg font-bold">
          Oportunidades{" "}
          <span className="text-sm font-normal text-muted-foreground tabular-nums">
            ({deals.length})
          </span>
        </h3>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link href={createHref}>
            <Plus className="size-3.5" />
            Nueva
          </Link>
        </Button>
      </div>
      {deals.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Sin oportunidades todavía. La IA del inbox las abre sola al detectar intención de compra.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {deals.map((deal) => (
            <li key={deal.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <Link href={`/crm/pipeline/deal/${deal.id}`} className="group min-w-0 rounded-md" title={deal.title}>
                <p className="truncate text-sm font-medium underline-offset-4 group-hover:underline">
                  {deal.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {deal.stage.name}
                  {deal.expected_close_date && ` · cierra ${formatCloseDate(deal.expected_close_date)}`}
                </p>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                {deal.value_cents !== null && (
                  <span className="text-sm font-medium whitespace-nowrap tabular-nums">
                    {formatMoney(deal.value_cents, deal.currency)}
                  </span>
                )}
                <StatePill tone={STATUS_TONE[deal.status]}>{STATUS_TEXT[deal.status]}</StatePill>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
