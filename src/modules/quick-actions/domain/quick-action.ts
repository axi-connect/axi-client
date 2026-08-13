import type { Schemas } from "@/core/api/types";

/**
 * Contratos del slice quick-actions (F9): acciones rápidas configurables del
 * tenant — recursos multimedia (la "carta"), respuestas de texto y plantillas
 * WhatsApp — disparables desde el inbox y por agentes IA (`send_resource`).
 */
export type QuickActionDTO = Schemas["QuickActionDto"];
export type QuickActionAssetDTO = Schemas["QuickActionAssetDto"];
export type QuickActionType = QuickActionDTO["type"];

/** Create/Update no salen tipados del spec (body zod plano): espejo manual. */
export interface CreateQuickActionDTO {
  name: string;
  description: string;
  type: QuickActionType;
  body?: string;
  template_name?: string;
  template_language?: string;
  template_components?: unknown[];
  /** type=interactive: el set de opciones; los ids los deriva el backend */
  interactive?: QuickActionInteractive;
  enabled?: boolean;
  ai_enabled?: boolean;
  asset_ids?: string[];
}

export type UpdateQuickActionDTO = Partial<Omit<CreateQuickActionDTO, "type">>;

/** Type alias (no interface): la index signature implícita lo hace compatible
 * con los Params del HttpClient. */
export type ListQuickActionsParams = {
  page?: number;
  page_size?: number;
  type?: QuickActionType;
  enabled?: boolean;
  search?: string;
};

export const QUICK_ACTION_TYPE_LABELS: Record<QuickActionType, string> = {
  media_resource: "Recurso",
  canned_response: "Respuesta",
  whatsapp_template: "Plantilla",
  interactive: "Interactivo",
};

export const QUICK_ACTION_TYPE_DESCRIPTIONS: Record<QuickActionType, string> = {
  media_resource: "Envía archivos precargados (PDF, imágenes) con un mensaje opcional",
  canned_response: "Envía un texto predefinido",
  whatsapp_template: "Envía una plantilla HSM aprobada de Meta",
  interactive: "Envía botones o un menú de opciones que el cliente toca",
};

/**
 * Mensaje interactivo configurado por el tenant (F5). El tipo se DERIVA del
 * contrato generado: los topes de Meta tienen una sola fuente de verdad.
 * El tenant escribe títulos y elige qué hace cada opción — **los ids los
 * deriva el backend**, así renombrar una opción no deja ids huérfanos.
 */
export type QuickActionInteractive = NonNullable<Schemas["CreateQuickActionDto"]["interactive"]>;
export type QuickActionInteractiveOptions = Extract<QuickActionInteractive, { kind: "options" }>;
export type QuickActionOption = QuickActionInteractiveOptions["options"][number];
export type QuickActionOptionAction = NonNullable<QuickActionOption["action"]>;

/** Qué pasa cuando el cliente toca la opción. */
export const QUICK_ACTION_OPTION_ACTION_LABELS: Record<QuickActionOptionAction, string> = {
  reply: "Continuar con el agente",
  human_handoff: "Pasar a un asesor",
  close: "Cerrar la conversación",
};

/** Fila que consume la DataTable de settings (type alias: exige DataRow). */
export type QuickActionRow = {
  id: string;
  name: string;
  description: string;
  type: QuickActionType;
  enabled: boolean;
  ai_enabled: boolean;
  assets_count: number;
  updated_at: string;
};

export function toQuickActionRow(dto: QuickActionDTO): QuickActionRow {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    type: dto.type,
    enabled: dto.enabled,
    ai_enabled: dto.ai_enabled,
    assets_count: dto.assets.length,
    updated_at: dto.updated_at,
  };
}
