import type { Schemas } from "@/core/api/types";

/**
 * Labels ES centralizados del CRM. Fuente canónica de los labels de etapa de
 * ciclo de vida: `modules/dashboard` los re-exporta desde aquí (no duplicar).
 */

export type ContactLifecycleStage = Schemas["ContactDto"]["lifecycle_stage"];
export type ContactSource = Schemas["ContactDto"]["source"];

export const CONTACT_STAGE_LABELS: Record<ContactLifecycleStage, string> = {
  prospect: "Prospecto",
  lead: "Lead",
  customer: "Cliente",
  other: "Otro",
};

/** Orden de progresión del ciclo de vida (para selects y ordenamientos). */
export const CONTACT_STAGE_ORDER: readonly ContactLifecycleStage[] = [
  "prospect",
  "lead",
  "customer",
  "other",
];

export const CONTACT_SOURCE_LABELS: Record<ContactSource, string> = {
  inbound_conversation: "Conversación",
  manual: "Manual",
  import: "Import CSV",
  lead_conversion: "Conversión de lead",
};
