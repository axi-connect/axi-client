"use client";

import { Lock, MoreHorizontal } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { formatMoney } from "@/core/lib/format";
import { StatePill, type StatePillTone } from "@/shared/components/features/bento";
import { ShopifyOriginBadge, StatusDotBadge } from "@/shared/components/ui/status-badges";
import { Switch } from "@/shared/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  describePromotionKind,
  isGovernedPromotion,
  promotionCodes,
  promotionState,
  promotionWhenNote,
  PROMOTION_STATE_LABELS,
  redemptionProgressPct,
  unredeemedCoupons,
  type PromotionDTO,
  type PromotionState,
} from "@/modules/marketing/domain/promotion";

const STATE_TONE: Record<PromotionState, StatePillTone> = {
  live: "success",
  scheduled: "neutral",
  exhausted: "neutral",
  expired: "neutral",
  off: "neutral",
};

/**
 * Fila de promoción (canvas 2026-09-26): el código y el nombre, las
 * condiciones, los canjes con su barra, el estado con su nota de vigencia, el
 * interruptor y el menú. La tarjeta es `@container`: estrecha, las columnas se
 * apilan bajo el nombre.
 *
 * Plan envíos+promos (E3): una promoción ESPEJADA del proveedor se ve para que
 * Marketing y Axel la conozcan, pero no se edita, apaga ni borra en axi — el
 * candado lo dice, y no lleva interruptor. Y cuando la tienda cobra los
 * pedidos, una promoción LOCAL no se aplicaría en el pago: el aviso lo
 * anticipa (`storeGovernsOrders`).
 */
export function PromotionCard({
  promotion,
  now,
  canManage,
  storeGovernsOrders = false,
  onEdit,
  onRedemptions,
  onToggle,
  onDelete,
}: {
  promotion: PromotionDTO;
  now: Date;
  canManage: boolean;
  /** La tienda cobra los pedidos: una promoción local no se aplicaría en su pago. */
  storeGovernsOrders?: boolean;
  onEdit: () => void;
  onRedemptions: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const state = promotionState(promotion, now);
  const isLive = state === "live";
  const pct = redemptionProgressPct(promotion);
  const governed = isGovernedPromotion(promotion);
  const codes = promotionCodes(promotion);
  const unredeemed = unredeemedCoupons(promotion);

  const terms = [describePromotionKind(promotion)];
  if (promotion.min_order_cents !== null) terms.push(`pedido mínimo ${formatMoney(promotion.min_order_cents)}`);
  if (!governed) {
    terms.push(
      promotion.max_redemptions_per_contact === 1 ? "1 por persona" : `${String(promotion.max_redemptions_per_contact)} por persona`,
    );
  }

  return (
    <article
      className={cn(
        "grid gap-x-6 gap-y-3 px-5 py-4 @3xl:grid-cols-[minmax(0,1fr)_12.5rem_10.5rem_auto] @3xl:items-center",
        !isLive && !governed && "text-muted-foreground",
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {governed ? <ShopifyOriginBadge className="shrink-0 text-[0.6875rem]" /> : null}
          {codes.slice(0, 2).map((code) => (
            <span key={code} className="bg-muted text-foreground shrink-0 rounded-md px-2 py-0.5 font-mono text-xs">
              {code}
            </span>
          ))}
          <h3
            className={cn("min-w-0 truncate font-heading text-[1.02rem] font-bold tracking-tight", isLive || governed ? "text-foreground" : "text-foreground/70")}
            title={promotion.name}
          >
            {promotion.name}
          </h3>
        </div>
        <p className="text-muted-foreground text-sm text-pretty">{terms.join(" · ")}</p>
        {governed ? (
          <p className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <Lock aria-hidden="true" className="size-3" />
            Se edita en la tienda
          </p>
        ) : null}
        {!governed && storeGovernsOrders ? (
          <StatusDotBadge tone="warning" className="w-fit text-[0.6875rem]">
            No aplica a pedidos cobrados en la tienda
          </StatusDotBadge>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        {governed ? (
          <p className="text-muted-foreground flex items-baseline justify-between gap-3 text-xs">
            <span>Canjes</span>
            <span>se canjea en tu tienda</span>
          </p>
        ) : (
          <>
            <p className="text-muted-foreground flex items-baseline justify-between gap-3 text-xs">
              <span>Canjes</span>
              <span className="whitespace-nowrap tabular-nums">
                <b className="text-foreground text-[0.8125rem] font-semibold">{promotion.redemptions_count.toLocaleString("es-CO")}</b>
                {promotion.max_redemptions_total !== null
                  ? ` de ${promotion.max_redemptions_total.toLocaleString("es-CO")}`
                  : " · sin tope"}
              </span>
            </p>
            <span
              role={pct !== null ? "progressbar" : undefined}
              aria-valuenow={pct ?? undefined}
              aria-valuemin={pct !== null ? 0 : undefined}
              aria-valuemax={pct !== null ? 100 : undefined}
              aria-label={pct !== null ? `Canjes de ${promotion.name}` : undefined}
              aria-hidden={pct === null ? true : undefined}
              className="bg-muted h-1.5 overflow-hidden rounded-full"
            >
              <span
                className={cn("block h-full rounded-full", isLive ? "bg-accent-amber" : "bg-muted-foreground/40")}
                style={{ width: `${String(pct ?? 0)}%` }}
              />
            </span>
            {unredeemed > 0 ? (
              <p className="text-muted-foreground text-xs tabular-nums">
                {unredeemed.toLocaleString("es-CO")} {unredeemed === 1 ? "cupón sin canjear" : "cupones sin canjear"}
              </p>
            ) : null}
          </>
        )}
      </div>

      <div className="flex min-w-0 flex-row flex-wrap items-center gap-x-2.5 gap-y-1 @3xl:flex-col @3xl:items-start">
        <StatePill tone={STATE_TONE[state]}>{PROMOTION_STATE_LABELS[state]}</StatePill>
        <span className="text-muted-foreground text-xs">{promotionWhenNote(promotion, now)}</span>
      </div>

      <div className="flex items-center gap-3 @3xl:justify-end">
        {canManage && !governed ? (
          <Switch
            checked={promotion.enabled}
            onCheckedChange={onToggle}
            aria-label={`Promoción ${promotion.name}`}
          />
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Más acciones de ${promotion.name}`}
              className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-ring inline-flex size-9 items-center justify-center rounded-full transition-colors focus-visible:outline-2"
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent portal align="end" className="w-48">
            <DropdownMenuItem onClick={onRedemptions}>Ver canjes</DropdownMenuItem>
            {canManage && !governed ? (
              <>
                <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                  Eliminar
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
