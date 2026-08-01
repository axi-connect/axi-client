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

/**
 * Clases del badge de etapa. Viven aquí (strings puros, sin React) para que la
 * etapa se vea idéntica en el 360, en el rail del inbox y en la cabecera del
 * chat — antes estaba copiado en cada vista.
 */
export const CONTACT_STAGE_BADGE_CLASSES: Record<ContactLifecycleStage, string> = {
  prospect: "border-transparent bg-secondary text-secondary-foreground",
  lead: "border-transparent bg-info/12 text-info",
  customer: "border-transparent bg-success/12 text-success",
  other: "border-border bg-transparent text-muted-foreground",
};

/** Orden de progresión del ciclo de vida (para selects y ordenamientos). */
export const CONTACT_STAGE_ORDER: readonly ContactLifecycleStage[] = [
  "prospect",
  "lead",
  "customer",
  "other",
];

export type ContactDocumentType = NonNullable<Schemas["ContactDto"]["document_type"]>;

/** Abreviaturas oficiales del documento (Colombia); se pintan junto al número. */
export const CONTACT_DOCUMENT_TYPE_LABELS: Record<ContactDocumentType, string> = {
  cc: "CC",
  ce: "CE",
  ti: "TI",
  pp: "Pasaporte",
  nit: "NIT",
};

export const CONTACT_SOURCE_LABELS: Record<ContactSource, string> = {
  inbound_conversation: "Conversación",
  manual: "Manual",
  import: "Import CSV",
  lead_conversion: "Conversión de lead",
};
