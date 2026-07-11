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
};

export const QUICK_ACTION_TYPE_DESCRIPTIONS: Record<QuickActionType, string> = {
  media_resource: "Envía archivos precargados (PDF, imágenes) con un mensaje opcional",
  canned_response: "Envía un texto predefinido",
  whatsapp_template: "Envía una plantilla HSM aprobada de Meta",
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
