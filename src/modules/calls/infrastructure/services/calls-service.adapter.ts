import type { Paginated } from "@/core/api/types";
import { http, type Params } from "@/core/services/http";
import type {
  CallRecordingUrlDTO,
  CallSessionDetailDTO,
  CallSessionRowDTO,
  CallsOverviewDTO,
  CallsOverviewGranularity,
  CallsSettingsDTO,
  ListCallSessionsParams,
  TenantCallNumberDTO,
} from "@/modules/calls/domain/call";

/** Adapter REST del módulo de llamadas (único punto que toca `http`). */

export function listCallSessions(
  params: ListCallSessionsParams = {},
): Promise<Paginated<CallSessionRowDTO>> {
  return http.get<Paginated<CallSessionRowDTO>>("/calls/sessions", params as Params);
}

export function getCallSession(id: string): Promise<CallSessionDetailDTO> {
  return http.get<CallSessionDetailDTO>(`/calls/sessions/${id}`);
}

/** URL firmada y efímera (TTL 300 s): se pide al momento de reproducir. */
export function getCallRecordingUrl(id: string): Promise<CallRecordingUrlDTO> {
  return http.get<CallRecordingUrlDTO>(`/calls/sessions/${id}/recording`);
}

/** Llamadas vivas (queued/initiated/ringing/in_progress) para el Monitoreo. */
export function listLiveCallSessions(): Promise<{ data: CallSessionRowDTO[] }> {
  return http.get<{ data: CallSessionRowDTO[] }>("/calls/sessions/live");
}

/** Banco de pruebas: origina una llamada real al número dado (calls:place). */
export function placeTestCall(input: {
  to: string;
  objective?: string;
}): Promise<{ call_session_id: string }> {
  return http.post<{ call_session_id: string }>("/calls/test-call", input);
}

export function getCallsOverview(
  granularity: CallsOverviewGranularity = "week",
): Promise<CallsOverviewDTO> {
  return http.get<CallsOverviewDTO>("/calls/overview", { granularity });
}

/** Config resuelta del tenant (`settings.calls`). */
export function getCallsSettings(): Promise<CallsSettingsDTO> {
  return http.get<CallsSettingsDTO>("/calls/settings");
}

/**
 * PUT de sección completa. A diferencia de agenda, el backend responde 204:
 * tras guardar hay que RE-CONSULTAR el GET para pintar la vista resuelta.
 */
export function putCallsSettings(dto: CallsSettingsDTO): Promise<void> {
  return http.put<void>("/calls/settings", dto);
}

/** El número (o números) asignados al tenant. Array plano, sin meta. */
export function listTenantCallNumbers(): Promise<TenantCallNumberDTO[]> {
  return http.get<TenantCallNumberDTO[]>("/calls/numbers");
}
