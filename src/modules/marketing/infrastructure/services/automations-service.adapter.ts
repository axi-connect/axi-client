import { http } from "@/core/services/http";
import type {
  AutomationDTO,
  AutomationMetricsDTO,
  CreateAutomationDTO,
  UpdateAutomationDTO,
} from "@/modules/marketing/domain/automation";
import type { TriggerType } from "@/modules/marketing/domain/enums";

/**
 * Adapter HTTP de las reglas de recuperación (`/marketing/automations`).
 *
 * El listado NO pagina ni busca (el backend no expone `page`/`q`): devuelve la
 * colección completa y el filtrado va en cliente. No montar `usePaginatedList`
 * aquí — no hay páginas que recorrer.
 */

export async function listAutomations(params: { trigger_type?: TriggerType } = {}): Promise<
  AutomationDTO[]
> {
  const res = await http.get<{ data: AutomationDTO[] }>("/marketing/automations", {
    ...params,
  });
  return res.data;
}

export function getAutomation(id: string): Promise<AutomationDTO> {
  return http.get<AutomationDTO>(`/marketing/automations/${id}`);
}

/** Nacen SIEMPRE apagadas: encenderlas es una decisión explícita del usuario. */
export function createAutomation(dto: CreateAutomationDTO): Promise<AutomationDTO> {
  return http.post<AutomationDTO>("/marketing/automations", dto);
}

/** Encender `deal_stalled` sin plantilla de Meta → 422 `automation_hsm_required`. */
export function updateAutomation(
  id: string,
  dto: UpdateAutomationDTO,
): Promise<AutomationDTO> {
  return http.patch<AutomationDTO>(`/marketing/automations/${id}`, dto);
}

export function deleteAutomation(id: string): Promise<void> {
  return http.delete<void>(`/marketing/automations/${id}`);
}

export function getAutomationMetrics(id: string): Promise<AutomationMetricsDTO> {
  return http.get<AutomationMetricsDTO>(`/marketing/automations/${id}/metrics`);
}
