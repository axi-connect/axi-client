import type { Schemas } from "@/core/api/types";
import { formatMoney } from "@/core/lib/format";

/**
 * Tipos del slice shipping (plan envíos+promos): alias del contrato generado.
 * Las zonas agrupan departamentos (ISO 3166-2:CO) y traen sus tarifas; una
 * zona sin departamentos es «resto del país».
 */
export type ShippingZoneDTO = Schemas["ShippingZoneDto"];
export type ShippingRateDTO = ShippingZoneDTO["rates"][number];
export type ShippingSettingsDTO = Schemas["ShippingSettingsDto"];
export type UpdateShippingSettingsDTO = Schemas["UpdateShippingSettingsDto"];
export type CreateShippingZoneDTO = Schemas["CreateShippingZoneDto"];
export type UpdateShippingZoneDTO = Schemas["UpdateShippingZoneDto"];
export type CreateShippingRateDTO = Schemas["CreateShippingRateDto"];
export type UpdateShippingRateDTO = Schemas["UpdateShippingRateDto"];

export const RATE_KIND_LABELS: Record<ShippingRateDTO["kind"], string> = {
  flat: "Tarifa fija",
  live: "Transportadora",
};

/** «Pedidos hasta $199.999» / «Pedidos desde $200.000» / «Entre … y …»; null = sin condición. */
export function describeRateCondition(
  rate: Pick<ShippingRateDTO, "min_order_cents" | "max_order_cents">,
  currency = "COP",
): string | null {
  const { min_order_cents: min, max_order_cents: max } = rate;
  if (min !== null && max !== null) {
    return `Pedidos entre ${formatMoney(min, currency)} y ${formatMoney(max, currency)}`;
  }
  if (min !== null) return `Pedidos desde ${formatMoney(min, currency)}`;
  if (max !== null) return `Pedidos hasta ${formatMoney(max, currency)}`;
  return null;
}

/**
 * Precio para la tabla: una `live` no tiene cifra (se confirma al cerrar) y una
 * plana a 0 se lee «Gratis», nunca «$0».
 */
export function describeRatePrice(
  rate: Pick<ShippingRateDTO, "kind" | "price_cents">,
  currency = "COP",
): { text: string; known: boolean } {
  if (rate.kind === "live" || rate.price_cents === null) {
    return { text: "Se calcula al cerrar", known: false };
  }
  if (rate.price_cents === 0) return { text: "Gratis", known: true };
  return { text: formatMoney(rate.price_cents, currency), known: true };
}

/** Una zona sin departamentos cubre el resto del país (E8). */
export function isRestOfCountry(zone: Pick<ShippingZoneDTO, "province_codes">): boolean {
  return zone.province_codes.length === 0;
}

export function isGovernedZone(zone: Pick<ShippingZoneDTO, "governed_by_connection_id">): boolean {
  return zone.governed_by_connection_id !== null;
}
