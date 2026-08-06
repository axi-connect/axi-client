"use client";

import { MoreHorizontal } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { formatMoney, formatShortDate } from "@/core/lib/format";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  describePromotionKind,
  promotionState,
  PROMOTION_STATE_LABELS,
  redemptionProgressPct,
  unredeemedCoupons,
  type PromotionDTO,
  type PromotionState,
} from "@/modules/marketing/domain/promotion";

/** El ámbar es el acento del módulo; lo apagado va en neutro (DESIGN §3.1). */
const STATE_CLASSES: Record<PromotionState, string> = {
  live: "border-success/40 bg-success/10 text-success",
  scheduled: "border-info/40 bg-info/10 text-info",
  exhausted: "border-border bg-muted text-muted-foreground",
  expired: "border-border bg-muted text-muted-foreground",
  off: "border-border bg-muted text-muted-foreground",
};

/**
 * Fila de promoción. El rail izquierdo en ámbar señala "esto está dando algo
 * ahora"; apagada, agotada o vencida se atenúan y el rail pasa a neutro.
 */
export function PromotionCard({
  promotion,
  now,
  canManage,
  onEdit,
  onRedemptions,
  onToggle,
  onDelete,
}: {
  promotion: PromotionDTO;
  now: Date;
  canManage: boolean;
  onEdit: () => void;
  onRedemptions: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const state = promotionState(promotion, now);
  const isLive = state === "live";
  const pct = redemptionProgressPct(promotion);
  const unredeemed = unredeemedCoupons(promotion);

  const terms: string[] = [];
  if (promotion.min_order_cents !== null) {
    terms.push(`Pedido mínimo ${formatMoney(promotion.min_order_cents)}`);
  }
  terms.push(
    promotion.max_redemptions_per_contact === 1
      ? "1 uso por contacto"
      : `${promotion.max_redemptions_per_contact} usos por contacto`,
  );
  if (promotion.ends_at !== null) {
    terms.push(
      state === "expired"
        ? `Venció el ${formatShortDate(promotion.ends_at)}`
        : `Hasta el ${formatShortDate(promotion.ends_at)}`,
    );
  }

  return (
    <article
      className={cn(
        "relative flex flex-wrap gap-4 px-5 py-4",
        !isLive && "text-muted-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-3.5 left-0 w-[3px] rounded-full",
          isLive ? "bg-accent-amber" : "bg-border",
        )}
      />

      <div className="min-w-[15rem] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={cn("text-[0.9375rem] font-semibold", !isLive && "text-foreground/70")}>
            {promotion.name}
          </h3>
          {promotion.shared_code && (
            <Badge
              variant="outline"
              className="border-accent-amber/45 bg-accent-amber/10 font-mono text-[0.6875rem] text-accent-amber"
            >
              {promotion.shared_code}
            </Badge>
          )}
          <Badge variant="outline" className={STATE_CLASSES[state]}>
            {PROMOTION_STATE_LABELS[state]}
          </Badge>
        </div>

        <p className="mt-0.5 text-sm">
          {describePromotionKind(promotion)}
          {promotion.validity_hours !== null && (
            <> · el cupón vence {promotion.validity_hours} h después de emitirse</>
          )}
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">{terms.join(" · ")}</p>
      </div>

      <div className="min-w-[11.5rem] space-y-1.5">
        <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
          <span>Canjes</span>
          <b className="text-[0.8125rem] font-semibold tabular-nums text-foreground">
            {promotion.redemptions_count.toLocaleString("es-CO")}
            {promotion.max_redemptions_total !== null &&
              ` de ${promotion.max_redemptions_total.toLocaleString("es-CO")}`}
          </b>
        </div>
        {pct !== null ? (
          <div
            className="h-1.5 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Canjes de ${promotion.name}`}
          >
            <div
              className={cn("h-full rounded-full", isLive ? "bg-accent-amber" : "bg-border")}
              style={{ width: `${pct}%` }}
            />
          </div>
        ) : (
          // Sin tope global no hay progreso que medir: una barra sin máximo no
          // significa nada.
          <p className="text-xs text-muted-foreground">Sin tope de canjes</p>
        )}
        <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
          <span>Cupones sin canjear</span>
          <b className="text-[0.8125rem] font-semibold tabular-nums text-foreground">
            {unredeemed.toLocaleString("es-CO")}
          </b>
        </div>
      </div>

      <div className="flex items-center gap-2 self-center">
        <Button size="sm" variant="outline" onClick={onRedemptions}>
          Canjes
        </Button>
        {canManage && (
          <>
            <Button size="sm" variant="outline" onClick={onEdit}>
              Editar
            </Button>
            <PromotionMenu
              enabled={promotion.enabled}
              onToggle={onToggle}
              onDelete={onDelete}
              name={promotion.name}
            />
          </>
        )}
      </div>
    </article>
  );
}

function PromotionMenu({
  enabled,
  name,
  onToggle,
  onDelete,
}: {
  enabled: boolean;
  name: string;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <details className="relative">
      <summary
        className="inline-flex size-8 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&::-webkit-details-marker]:hidden"
        aria-label={`Más acciones de ${name}`}
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </summary>
      <div className="glass absolute right-0 z-10 mt-1 w-48 overflow-hidden rounded-lg p-1">
        <button
          type="button"
          className="w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent"
          onClick={onToggle}
        >
          {enabled ? "Apagar promoción" : "Encender promoción"}
        </button>
        <button
          type="button"
          className="w-full rounded-md px-2.5 py-1.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
          onClick={onDelete}
        >
          Eliminar
        </button>
      </div>
    </details>
  );
}
