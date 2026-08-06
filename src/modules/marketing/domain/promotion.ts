import type { Schemas } from "@/core/api/types";
import { formatMoney } from "@/core/lib/format";
import { PROMOTION_KIND_LABELS, type PromotionKind } from "./enums";

/** Contratos de promociones y cupones (`/marketing/promotions`). */

export type PromotionDTO = Schemas["PromotionDto"];
export type CreatePromotionDTO = Schemas["CreatePromotionDto"];
export type UpdatePromotionDTO = Schemas["UpdatePromotionDto"];
export type RedemptionDTO = Schemas["RedemptionsListDto"]["data"][number];

/**
 * Qué parámetro exige cada tipo. El backend valida que venga EXACTAMENTE ese y
 * ningún otro (422 `promotion_invalid_params`), así que el formulario muestra
 * uno solo y limpia los demás al cambiar de tipo.
 */
export const PROMOTION_KIND_PARAM: Record<PromotionKind, keyof PromotionDTO> = {
  percent_discount: "percent",
  fixed_discount: "amount_cents",
  gift_product: "gift_variant_id",
  free_shipping: "shipping_value_cents",
};

/** Resumen legible de lo que da la promoción ("25% de descuento"). */
export function describePromotionKind(promotion: PromotionDTO): string {
  switch (promotion.kind) {
    case "percent_discount":
      return promotion.percent !== null
        ? `${promotion.percent}% de descuento`
        : PROMOTION_KIND_LABELS.percent_discount;
    case "fixed_discount":
      return promotion.amount_cents !== null
        ? `${formatMoney(promotion.amount_cents)} de descuento`
        : PROMOTION_KIND_LABELS.fixed_discount;
    case "free_shipping":
      return promotion.shipping_value_cents !== null
        ? `Envío gratis · descuenta ${formatMoney(promotion.shipping_value_cents)} de flete`
        : PROMOTION_KIND_LABELS.free_shipping;
    case "gift_product":
      return PROMOTION_KIND_LABELS.gift_product;
  }
}

/**
 * Una promoción "viva" es la que puede emitir cupones AHORA: encendida, dentro
 * de su vigencia y sin agotar el tope global. Es lo que decide si aparece en el
 * selector de una regla y si se pinta con el acento ámbar o apagada.
 */
export function isPromotionLive(promotion: PromotionDTO, now: Date): boolean {
  if (!promotion.enabled) return false;
  if (new Date(promotion.starts_at).getTime() > now.getTime()) return false;
  if (promotion.ends_at !== null && new Date(promotion.ends_at).getTime() < now.getTime()) {
    return false;
  }
  return !isPromotionExhausted(promotion);
}

export function isPromotionExhausted(promotion: PromotionDTO): boolean {
  if (promotion.max_redemptions_total === null) return false;
  return promotion.redemptions_count >= promotion.max_redemptions_total;
}

export function isPromotionExpired(promotion: PromotionDTO, now: Date): boolean {
  return promotion.ends_at !== null && new Date(promotion.ends_at).getTime() < now.getTime();
}

/** Estado derivado para el badge; no existe como campo en el DTO. */
export type PromotionState = "live" | "exhausted" | "expired" | "scheduled" | "off";

export function promotionState(promotion: PromotionDTO, now: Date): PromotionState {
  if (!promotion.enabled) return "off";
  if (isPromotionExhausted(promotion)) return "exhausted";
  if (isPromotionExpired(promotion, now)) return "expired";
  if (new Date(promotion.starts_at).getTime() > now.getTime()) return "scheduled";
  return "live";
}

export const PROMOTION_STATE_LABELS: Record<PromotionState, string> = {
  live: "Activa",
  exhausted: "Agotada",
  expired: "Vencida",
  scheduled: "Programada",
  off: "Apagada",
};

/**
 * Progreso de canjes (0–100) para la barra. Sin tope global no hay progreso que
 * medir: devuelve `null` y la vista muestra la cifra sin barra en vez de una
 * barra que no significa nada.
 */
export function redemptionProgressPct(promotion: PromotionDTO): number | null {
  if (promotion.max_redemptions_total === null || promotion.max_redemptions_total <= 0) {
    return null;
  }
  const pct = (promotion.redemptions_count / promotion.max_redemptions_total) * 100;
  return Math.min(100, Math.round(pct));
}

/**
 * Filtro de estado del catálogo. Qué cuenta como "activa" es una decisión de
 * negocio (una programada todavía no da nada, pero va a darlo), así que vive
 * en el dominio y se testea sin montar la vista.
 */
export type PromotionStateFilter = "active" | "all" | "off" | "expired";

export const PROMOTION_STATE_FILTER_LABELS: Record<PromotionStateFilter, string> = {
  active: "Activas",
  all: "Todas",
  off: "Apagadas",
  expired: "Vencidas o agotadas",
};

export function matchesPromotionStateFilter(
  state: PromotionState,
  filter: PromotionStateFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "active":
      return state === "live" || state === "scheduled";
    case "off":
      return state === "off";
    case "expired":
      return state === "expired" || state === "exhausted";
  }
}

/**
 * Cupones emitidos que nadie ha canjeado.
 *
 * OJO: NO son "cupones vivos". El DTO no expone cuántos vencieron, así que este
 * número incluye los caducados y no se puede afinar sin un campo nuevo del
 * backend. La UI debe etiquetarlo "sin canjear", nunca "vigentes".
 */
export function unredeemedCoupons(promotion: PromotionDTO): number {
  return Math.max(0, promotion.coupons_issued - promotion.redemptions_recorded);
}
