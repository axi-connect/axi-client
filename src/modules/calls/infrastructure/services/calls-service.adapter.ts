import type { Paginated } from "@/core/api/types";
import { http, type Params } from "@/core/services/http";
import type {
  CallRecordingUrlDTO,
  CallSessionDetailDTO,
  CallSessionRowDTO,
  CallsOverviewDTO,
  CallsOverviewGranularity,
  ListCallSessionsParams,
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

export function getCallsOverview(
  granularity: CallsOverviewGranularity = "week",
): Promise<CallsOverviewDTO> {
  return http.get<CallsOverviewDTO>("/calls/overview", { granularity });
}
