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
  LaunchCallInput,
  TenantCallNumberDTO,
} from "@/modules/calls/domain/call";
import type {
  CallsFunnelDTO,
  PlaybookStage,
  PlaybookView,
  PreviewOpeningDTO,
  ProactiveCallType,
  ProposeResultDTO,
} from "@/modules/calls/domain/playbooks";

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
  call_type?: LaunchCallInput["call_type"];
  mode?: LaunchCallInput["mode"];
  ai_agent_id?: string;
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

// ─── Plan de modos: lanzar, embudo y marcos ─────────────────────────────────

/**
 * «Llamar» a un contacto (calls:place). `idempotencyKey` = una por intención
 * del usuario: un doble clic o un reintento devuelven la MISMA llamada.
 */
export function launchCall(
  input: LaunchCallInput,
  idempotencyKey: string,
): Promise<{ call_session_id: string }> {
  return http.post<{ call_session_id: string }>("/calls/launch", input, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
}

/** Hasta qué etapa llegan las proactivas, por tipo, en el ciclo. */
export function getCallsFunnel(): Promise<CallsFunnelDTO> {
  return http.get<CallsFunnelDTO>("/calls/overview/funnel");
}

export function listPlaybooks(): Promise<PlaybookView[]> {
  return http.get<PlaybookView[]>("/calls/playbooks");
}

/** Se manda el marco COMPLETO; el servidor guarda solo lo distinto de la base. */
export function savePlaybook(
  type: ProactiveCallType,
  body: { enabled: boolean; opening_guidance: string; stages: PlaybookStage[] },
): Promise<PlaybookView> {
  return http.put<PlaybookView>(`/calls/playbooks/${type}`, body);
}

export function resetPlaybook(type: ProactiveCallType): Promise<PlaybookView> {
  return http.delete<PlaybookView>(`/calls/playbooks/${type}`);
}

export function proposePlaybooks(types?: ProactiveCallType[]): Promise<ProposeResultDTO> {
  return http.post<ProposeResultDTO>("/calls/playbooks/propose", types === undefined ? {} : { call_types: types });
}

export function applyPlaybookProposal(type: ProactiveCallType): Promise<PlaybookView> {
  return http.post<PlaybookView>(`/calls/playbooks/${type}/proposal/apply`, {});
}

export function discardPlaybookProposal(type: ProactiveCallType): Promise<PlaybookView> {
  return http.delete<PlaybookView>(`/calls/playbooks/${type}/proposal`);
}

/** «Así abriría»: sin cuerpo = el marco guardado; con cuerpo = el borrador. */
export function previewPlaybookOpening(
  type: ProactiveCallType,
  draft?: { opening_guidance: string; stages: PlaybookStage[] },
): Promise<PreviewOpeningDTO> {
  return http.post<PreviewOpeningDTO>(`/calls/playbooks/${type}/preview-opening`, draft ?? {});
}

