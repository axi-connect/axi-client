"use client";

import { cn } from "@/core/lib/utils";
import { formatMoney, formatShortDate } from "@/core/lib/format";
import { Badge } from "@/shared/components/ui/badge";
import { DEAL_STATUS_LABELS, type DealDTO, type DealStatus } from "@/modules/crm/domain/deal";

const STATUS_BADGE_CLASSES: Record<DealStatus, string> = {
  open: "border-transparent bg-info/12 text-info",
  won: "border-transparent bg-success/12 text-success",
  lost: "border-transparent bg-destructive/12 text-destructive",
};

/**
 * Oportunidades del contacto (`GET /crm/deals?contact_id=`). Solo lectura en
 * F2; el link al rail del deal y "Nueva oportunidad" se activan en F3.
 */
export function ContactDealsCard({ deals }: { deals: DealDTO[] }) {
  return (
    <section className="rounded-2xl border border-border bg-background p-4 md:p-6">
      <h3 className="text-base font-semibold">
        Oportunidades{" "}
        <span className="text-sm font-normal text-muted-foreground tabular-nums">
          ({deals.length})
        </span>
      </h3>
      {deals.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Sin oportunidades todavía. La IA del inbox las abre sola al detectar intención de compra.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {deals.map((deal) => (
            <li key={deal.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{deal.title}</p>
                <p className="text-xs text-muted-foreground">
                  {deal.stage.name}
                  {deal.expected_close_date && ` · cierra ${formatShortDate(deal.expected_close_date)}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {deal.value_cents !== null && (
                  <span className="text-sm font-medium tabular-nums">
                    {formatMoney(deal.value_cents, deal.currency)}
                  </span>
                )}
                <Badge variant="outline" className={cn(STATUS_BADGE_CLASSES[deal.status])}>
                  {DEAL_STATUS_LABELS[deal.status]}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
