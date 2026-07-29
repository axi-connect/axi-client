import { http } from "@/core/services/http";
import type { Paginated } from "@/core/api/types";
import type {
  CreateDealDTO,
  DealDTO,
  DealEventDTO,
  DealStatsDTO,
  DealStatsPeriod,
  ListDealsParams,
  UpdateDealDTO,
} from "@/modules/crm/domain/deal";

/** Adapter HTTP de deals (`/crm/deals`, permiso crm:read; DELETE crm:manage). */
export function listDeals(params: ListDealsParams = {}): Promise<Paginated<DealDTO>> {
  return http.get<Paginated<DealDTO>>("/crm/deals", params);
}

export function getDeal(id: string): Promise<DealDTO> {
  return http.get<DealDTO>(`/crm/deals/${id}`);
}

/** 409 `crm/deal_already_open` si la conversación ya tiene un deal abierto. */
export function createDeal(dto: CreateDealDTO): Promise<DealDTO> {
  return http.post<DealDTO>("/crm/deals", dto);
}

export function updateDeal(id: string, dto: UpdateDealDTO): Promise<DealDTO> {
  return http.patch<DealDTO>(`/crm/deals/${id}`, dto);
}

export function deleteDeal(id: string): Promise<void> {
  return http.delete<void>(`/crm/deals/${id}`);
}

/** Drag del kanban: solo cambia de etapa (misma pipeline) y resetea el reloj. */
export function moveDeal(id: string, stageId: string): Promise<DealDTO> {
  return http.post<DealDTO>(`/crm/deals/${id}/move`, { stage_id: stageId });
}

/** Promueve el contacto a customer server-side. `value_cents` = ajuste final. */
export function winDeal(id: string, valueCents?: number): Promise<DealDTO> {
  return http.post<DealDTO>(`/crm/deals/${id}/win`, {
    value_cents: valueCents,
  });
}

export function loseDeal(id: string, reason?: string): Promise<DealDTO> {
  return http.post<DealDTO>(`/crm/deals/${id}/lose`, { reason });
}

/** won|lost → open. Transición ilegal → 409 `crm/invalid_deal_transition`. */
export function reopenDeal(id: string): Promise<DealDTO> {
  return http.post<DealDTO>(`/crm/deals/${id}/reopen`, {});
}

export function getDealStats(
  period: DealStatsPeriod,
  pipelineId?: string,
): Promise<DealStatsDTO> {
  return http.get<DealStatsDTO>("/crm/deals/stats", {
    period,
    pipeline_id: pipelineId,
  });
}

/** Timeline del deal: ascendente, sin paginar. */
export async function getDealEvents(id: string): Promise<DealEventDTO[]> {
  const res = await http.get<{ data: DealEventDTO[] }>(`/crm/deals/${id}/events`);
  return res.data;
}
