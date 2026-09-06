import type { Schemas } from "@/core/api/types";

import { formatCop } from "@/modules/landing/public";

/**
 * Entitlements del tenant (`GET /me/entitlements`): qué
 * capacidades tiene y qué incluye su oferta, ya en unidades comerciales. El
 * backend devuelve la copia calculada (`quantity_display`, `unit_label`): el
 * frontend nunca divide tokens.
 */

export type EntitlementsDTO = Schemas["EntitlementsDto"];

/** Una línea de «lo que incluye tu prueba», ya formateada por el backend. */
export type EntitlementIncluded = EntitlementsDTO["included"][number];

/** «8 de septiembre»: la fecha de fin de la prueba, para meterla en una frase; `null` sin trial. */
export function trialEndsDate(entitlements: EntitlementsDTO, locale = "es-CO"): string | null {
  if (!entitlements.trial.active || !entitlements.trial.ends_at) return null;
  const date = new Date(entitlements.trial.ends_at);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(date);
}

/** «Vence el 8 de septiembre» para el pie del bloque; `null` sin trial. */
export function trialEndsLabel(entitlements: EntitlementsDTO, locale = "es-CO"): string | null {
  const date = trialEndsDate(entitlements, locale);
  return date ? `Vence el ${date}` : null;
}

/** Nombre comercial de lo elegido: el paquete, o «N módulos». */
export function offerLabel(entitlements: EntitlementsDTO): string {
  const packagePlan = entitlements.plans.find((plan) => plan.kind === "package");
  if (packagePlan) return packagePlan.name;
  const modules = entitlements.plans.filter((plan) => plan.kind === "module");
  if (modules.length === 1) return `Módulo ${modules[0].name}`;
  if (modules.length > 1) return `${modules.length} módulos`;
  return "Tu prueba";
}

/** La cotización que el servidor guardó en el alta (Tanda B); `null` en altas viejas o sin precio publicado. */
export type EntitlementsQuote = NonNullable<EntitlementsDTO["quote"]>;

/** «31 de diciembre de 2026». */
function longDate(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(date);
}

/**
 * La línea de la bienvenida que dice cuánto se pagará tras la prueba, tal cual
 * lo cotizó el servidor en el alta: precio por periodo (el mes, o los 12 meses
 * de servicio del anual), el tramo, el periodo y la promoción con su fecha.
 * Si la promoción cerró mientras la persona se registraba
 * (`promotion_outcome === "closed"`), lo dice con todas las letras: el precio
 * que ve es el de lista y nadie se lo cambia después. `null` sin cotización.
 */
export function quoteLine(entitlements: EntitlementsDTO, locale = "es-CO"): { text: string; closed: boolean } | null {
  const quote = entitlements.quote;
  if (!quote) return null;
  const amount = formatCop(Math.round(quote.amount_cents / 100));
  const price = quote.interval === "annual" ? `${amount} por 12 meses` : `${amount}/mes`;
  const volume = quote.volume_label ? `${quote.volume_label} conversaciones al mes` : null;
  if (quote.promotion_outcome === "closed") {
    return { text: ["La promoción cerró mientras te registrabas: tu precio tras la prueba es " + price, volume].filter(Boolean).join(" · "), closed: true };
  }
  const interval = quote.interval === "annual" ? "pago anual" : "pago mensual";
  const until = longDate(quote.expires_at, locale);
  const promotion =
    quote.promotion_outcome === "applied" && quote.promotion_name ? `${quote.promotion_name}${until ? ` hasta el ${until}` : ""}` : null;
  return { text: [`Tras la prueba: ${price}`, volume, interval, promotion].filter(Boolean).join(" · "), closed: false };
}
