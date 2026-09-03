import type { Schemas } from "@/core/api/types";

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
