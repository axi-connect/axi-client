import type { OffsetQuery, Schemas } from "@/core/api/types";

/**
 * Contratos de deals (`/crm/deals`). F2 solo consume el listado por contacto
 * (card "Oportunidades" del 360); mappers, board y máquina de estados llegan
 * en F3 (`deal-state.ts`).
 */

export type DealDTO = Schemas["DealDto"];
export type DealStatus = DealDTO["status"];

export type ListDealsParams = OffsetQuery & {
  pipeline_id?: string;
  stage_id?: string;
  status?: DealStatus;
  owner_user_id?: string;
  contact_id?: string;
  q?: string;
  sort?: "stage_entered_at" | "value_cents" | "expected_close_date";
};

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  open: "Abierto",
  won: "Ganado",
  lost: "Perdido",
};

export const DEAL_SOURCE_LABELS: Record<DealDTO["source"], string> = {
  manual: "Manual",
  ai_conversation: "Conversación IA",
  automation: "Automatización",
  import: "Import",
};

// ---------------------------------------------------------------------------
// Pipeline, board y operaciones (F3)
// ---------------------------------------------------------------------------

export type PipelineDTO = Schemas["PipelineDto"];
export type PipelineStageDTO = PipelineDTO["stages"][number];
export type BoardDTO = Schemas["BoardDto"];
export type BoardColumnDTO = BoardDTO["columns"][number];
export type DealStatsDTO = Schemas["DealStatsDto"];
export type DealStatsPeriod = DealStatsDTO["period"];
export type DealEventDTO = Schemas["DealEventsListDto"]["data"][number];

export type CreateDealDTO = Schemas["CreateDealDto"];
export type UpdateDealDTO = Schemas["UpdateDealDto"];

/**
 * Los `deals[]` del board son un objeto inline estructuralmente idéntico a
 * `DealDto` pero sin `$ref`: este normalizador deja UN solo tipo de dominio.
 */
export function normalizeBoardDeal(deal: BoardColumnDTO["deals"][number]): DealDTO {
  return deal as DealDTO;
}

export const DEAL_EVENT_LABELS: Record<DealEventDTO["type"], string> = {
  created: "Creada",
  updated: "Actualizada",
  stage_changed: "Cambio de etapa",
  won: "Ganada",
  lost: "Perdida",
  reopened: "Reabierta",
  value_changed: "Cambio de valor",
  owner_changed: "Cambio de dueño",
  order_attached: "Pedido vinculado",
  stalled: "Estancada",
};
