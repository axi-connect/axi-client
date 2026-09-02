/**
 * Entitlements del tenant (`GET /me/entitlements`, contrato B1): qué
 * capacidades tiene y qué incluye su oferta, ya en unidades comerciales. El
 * backend devuelve la copia calculada (`quantity_display`, `unit_label`): el
 * frontend nunca divide tokens.
 */

// CONTRACT: `Schemas["EntitlementsDto"]` en F7.
export type EntitlementIncluded = {
  metric: string;
  period: "day" | "billing_cycle";
  quantity_raw: number;
  /** «75», «50», «200» — ya formateado por el backend en es-CO. */
  quantity_display: string;
  /** «conversaciones con IA», «notas de voz del agente»… */
  unit_label: string;
  approx_display?: string | null;
  used_raw?: number | null;
  used_display?: string | null;
};

export type EntitlementsDTO = {
  offer_kind: "package" | "modules" | "none";
  plans: Array<{ id: string; code: string; public_slug: string; kind: "package" | "module"; name: string }>;
  capabilities: string[];
  pending_offer: { plan_ids: string[] } | null;
  trial: { active: boolean; ends_at: string | null };
  included: EntitlementIncluded[];
};

/** «Vence el 8 de septiembre» para el pie del bloque; `null` sin trial. */
export function trialEndsLabel(entitlements: EntitlementsDTO, locale = "es-CO"): string | null {
  if (!entitlements.trial.active || !entitlements.trial.ends_at) return null;
  const date = new Date(entitlements.trial.ends_at);
  if (Number.isNaN(date.getTime())) return null;
  return `Vence el ${new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(date)}`;
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
