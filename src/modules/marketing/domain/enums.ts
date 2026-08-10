import type { Schemas } from "@/core/api/types";

/**
 * Vocabulario del módulo: uniones derivadas del contrato + sus etiquetas en
 * español. TypeScript puro (arquitectura §3.3.1): sin React, sin http, sin zod.
 *
 * Los labels viven aquí y no en la UI porque los comparten tablas, badges,
 * selects y el feed en vivo: un mismo estado no puede llamarse de dos maneras
 * en dos pantallas (memoria "labels uniformes").
 */

// --- Campañas --------------------------------------------------------------

export type CampaignStatus = Schemas["CampaignDto"]["status"];

export const CAMPAIGN_STATUS_ORDER: readonly CampaignStatus[] = [
  "draft",
  "scheduled",
  "running",
  "paused",
  "completed",
  "cancelled",
] as const;

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Borrador",
  scheduled: "Programada",
  running: "Enviando",
  paused: "Pausada",
  // NO "Completada": `completed` solo dice que se despachó a todos. La entrega
  // se sigue confirmando durante minutos (KB §2.15) y las cifras siguen vivas.
  completed: "Procesada",
  cancelled: "Cancelada",
};

// --- Destinatarios ---------------------------------------------------------

export type RecipientStatus =
  Schemas["CampaignRecipientsListDto"]["data"][number]["status"];

export const RECIPIENT_STATUS_LABELS: Record<RecipientStatus, string> = {
  pending: "Pendiente",
  queued: "En cola",
  sent: "Enviado",
  delivered: "Entregado",
  read: "Leído",
  failed: "Falló",
  skipped: "Omitido",
};

// --- Recuperación ----------------------------------------------------------

export type TriggerType = Schemas["AutomationDto"]["trigger_type"];

export const TRIGGER_ORDER: readonly TriggerType[] = [
  "cart_abandoned",
  "conversation_inactive",
  "deal_stalled",
] as const;

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  cart_abandoned: "Carrito abandonado",
  conversation_inactive: "Conversación inactiva",
  deal_stalled: "Oportunidad estancada",
};

/** Qué señal concreta dispara cada regla, en el idioma del negocio. */
export const TRIGGER_DESCRIPTIONS: Record<TriggerType, string> = {
  cart_abandoned: "Un pedido lleva un rato en borrador y nadie lo terminó",
  conversation_inactive: "Una conversación abierta se quedó callada",
  deal_stalled: "El CRM marcó la oportunidad como estancada",
};

// --- Promociones -----------------------------------------------------------

export type PromotionKind = Schemas["PromotionDto"]["kind"];

export const PROMOTION_KIND_ORDER: readonly PromotionKind[] = [
  "percent_discount",
  "fixed_discount",
  "gift_product",
  "free_shipping",
] as const;

export const PROMOTION_KIND_LABELS: Record<PromotionKind, string> = {
  percent_discount: "% de descuento",
  fixed_discount: "Monto fijo",
  gift_product: "Producto de regalo",
  free_shipping: "Envío gratis",
};

// --- Plantillas ------------------------------------------------------------

export type TemplateKind = Schemas["TemplateDto"]["kind"];

export const TEMPLATE_KIND_LABELS: Record<TemplateKind, string> = {
  text: "Texto",
  media: "Imagen o archivo",
  hsm: "Plantilla de Meta",
};

export type HsmApprovalStatus = Schemas["HsmTemplateDto"]["approval_status"];

export const HSM_APPROVAL_LABELS: Record<HsmApprovalStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  paused: "Pausada",
  disabled: "Deshabilitada",
};

export type HsmCategory = Schemas["HsmTemplateDto"]["category"];

export const HSM_CATEGORY_LABELS: Record<HsmCategory, string> = {
  marketing: "Marketing",
  utility: "Utilidad",
  authentication: "Autenticación",
};

// --- Bajas -----------------------------------------------------------------

export type OptOutSource = Schemas["OptOutsListDto"]["data"][number]["source"];

export const OPT_OUT_SOURCE_LABELS: Record<OptOutSource, string> = {
  inbound_keyword: "El cliente escribió una palabra de baja",
  manual: "Alta manual",
  import: "Importación",
};
