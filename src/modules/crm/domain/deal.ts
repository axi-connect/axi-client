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
