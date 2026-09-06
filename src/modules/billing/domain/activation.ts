import { isHttpError } from "@/core/api/problem";
import type { Schemas } from "@/core/api/types";

/**
 * La activación del plan (Tanda B): lo que el alta cotizó, lo que rige hoy y en
 * qué punto está el cliente. En TypeScript puro; nada de fechas del sistema
 * salvo por parámetro. Los tipos son alias del contrato generado
 * (`BillingActivationDto` y compañía): el cliente no redeclara el servidor.
 */

export type ActivationDTO = Schemas["BillingActivationDto"];
export type ActivationState = ActivationDTO["state"];
export type ActivationQuoteDTO = NonNullable<ActivationDTO["quote_now"]>;
export type ActivationInterval = ActivationQuoteDTO["interval"];
export type ConfirmActivationBody = Schemas["BillingConfirmActivationDto"];
export type ActivationConfirmedDTO = Schemas["BillingActivationConfirmedDto"];

/**
 * Qué tarjeta se pinta. `hidden` cuando no hay nada que activar desde aquí: el
 * plan ya está activo o la vista no pudo cargarse.
 *
 * `price_changed` gana a `ready`: es el único caso en que la tarjeta cambia de
 * trabajo (pide una segunda confirmación) en vez de solo cambiar de texto.
 */
export type ActivationVariant =
  | "hidden"
  | "ready"
  | "price_changed"
  | "expired_quote"
  | "pending_payment"
  | "no_offer"
  | "unsupported";

export function activationVariant(view: ActivationDTO | null): ActivationVariant {
  if (view === null || view.state === "active") return "hidden";
  switch (view.state) {
    case "pending_payment":
      return "pending_payment";
    case "trial_no_offer":
      // Cinturón (B4-M1): sin fecha de fin de prueba no es un trial, es un
      // tenant de pago sin término; el servidor ya lo marca `active`, pero si
      // no lo hiciera la tarjeta no puede mandarlo a elegir plan.
      return view.trial_ends_at === null ? "hidden" : "no_offer";
    case "unsupported":
      return "unsupported";
    case "expired_quote":
      // La cotización venció y el precio de hoy es otro: misma segunda
      // confirmación que `price_changed`, pero la causa se dice tal cual.
      return view.price_changed ? "expired_quote" : "ready";
    default:
      return view.price_changed ? "price_changed" : "ready";
  }
}

/** Lo que se ahorra por periodo respecto a la lista; 0 si no hay descuento. */
export function savingsCents(quote: Pick<ActivationQuoteDTO, "list_amount_cents" | "amount_cents">): number {
  return Math.max(0, quote.list_amount_cents - quote.amount_cents);
}

/**
 * «Crecimiento · 1.000 conversaciones al mes · Pago mensual» — la oferta en una
 * línea, como en el mockup. Sin tramo (módulos) se omite el segundo trozo.
 */
export function offerLabel(
  quote: Pick<ActivationQuoteDTO, "plan_name" | "volume_label" | "interval">,
): string {
  return [
    quote.plan_name,
    quote.volume_label === null ? null : `${quote.volume_label} conversaciones al mes`,
    quote.interval === "annual" ? "Pago anual" : "Pago mensual",
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");
}

const DAY_MS = 86_400_000;

/** Días enteros hasta una fecha ISO (0 el mismo día); null si ya pasó o no hay fecha. */
export function daysUntil(iso: string | null, now: Date = new Date()): number | null {
  if (iso === null) return null;
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return null;
  const days = Math.ceil((at - now.getTime()) / DAY_MS);
  return days < 0 ? null : days;
}

/**
 * La cotización de hoy que viaja en un 409 `billing/price_changed`: el servidor
 * la manda en `details.quote_now` para que la segunda confirmación muestre
 * exactamente lo que va a facturar. `null` si el error es otro.
 *
 * `billing/promotion_closed` entra por la misma puerta cuando trae cotización:
 * la promoción que el cliente eligió se agotó o venció, que es OTRA causa del
 * mismo hecho. Sin esto, el cliente veía un error seco y se quedaba sin forma
 * de activar su plan al precio de hoy.
 */
const QUOTED_ERROR_CODES = ["billing/price_changed", "billing/promotion_closed"];

export function priceChangedFromError(error: unknown): ActivationQuoteDTO | null {
  if (!isHttpError(error) || !QUOTED_ERROR_CODES.includes(error.code ?? "")) return null;
  const quote = error.problem?.details?.quote_now;
  if (typeof quote !== "object" || quote === null) return null;
  const candidate = quote as Partial<ActivationQuoteDTO>;
  if (typeof candidate.amount_cents !== "number" || typeof candidate.plan_name !== "string") {
    return null;
  }
  return candidate as ActivationQuoteDTO;
}
