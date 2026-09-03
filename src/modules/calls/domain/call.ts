import type { OffsetQuery, Schemas } from "@/core/api/types";
import type { StatusMap } from "@/shared/components/features/status-badge";

/**
 * Dominio del módulo de llamadas (F4). Los tipos derivan del contrato OpenAPI
 * (backend calls F4-A); aquí solo viven etiquetas, mapas de estado y el
 * aplanado para DataTable — TS puro, sin React ni http.
 */

export type CallSessionRowDTO = Schemas["CallSessionsListDto"]["data"][number];
export type CallSessionDetailDTO = Schemas["CallSessionDetailDto"];
export type CallsOverviewDTO = Schemas["CallsOverviewDto"];
export type CallRecordingUrlDTO = Schemas["CallRecordingUrlDto"];
export type CallTranscriptSegment = CallSessionDetailDTO["segments"][number];
export type CallEventItem = CallSessionDetailDTO["events"][number];

export type CallsSettingsDTO = Schemas["CallsSettingsDto"];
export type TenantCallNumberDTO = Schemas["TenantCallNumberDto"];

export type CallDirection = CallSessionRowDTO["direction"];
export type CallPurpose = CallSessionRowDTO["purpose"];
export type CallSessionStatus = CallSessionRowDTO["status"];
export type CallOutcome = NonNullable<CallSessionRowDTO["outcome"]>;
export type CallAnsweredBy = NonNullable<CallSessionRowDTO["answered_by"]>;
export type CallsOverviewGranularity = "day" | "week" | "month";

export type ListCallSessionsParams = OffsetQuery & {
  direction?: CallDirection;
  status?: CallSessionStatus;
  outcome?: CallOutcome;
  purpose?: CallPurpose;
  ai_agent_id?: string;
  /** Rango ISO sobre created_at (gte / lt). */
  from?: string;
  to?: string;
  /** Las llamadas de UN contacto (rail del inbox / ficha CRM). */
  contact_id?: string;
  /** Nombre del contacto o dígitos del número. */
  q?: string;
};

export const DIRECTION_LABELS: Record<CallDirection, string> = {
  outbound: "Saliente",
  inbound: "Entrante",
};

export const CALL_PURPOSE_LABELS: Record<CallPurpose, string> = {
  inbound: "Atención entrante",
  appointment_reminder: "Recordatorio de cita",
  crm_task: "Seguimiento CRM",
  campaign: "Campaña",
  manual: "Llamada manual",
};

export const ANSWERED_BY_LABELS: Record<CallAnsweredBy, string> = {
  human: "Persona (no buzón)",
  machine: "Buzón de voz",
  unknown: "Sin determinar",
  fax: "Fax",
};

/** Estados del ciclo de vida (columna `status`). */
export const CALL_STATUS_MAP: StatusMap = {
  queued: { label: "En cola", tone: "neutral", transient: true },
  initiated: { label: "Marcando", tone: "info", transient: true },
  ringing: { label: "Timbrando", tone: "info", transient: true },
  in_progress: { label: "En conversación", tone: "success", transient: true },
  completed: { label: "Completada", tone: "success" },
  no_answer: { label: "Sin respuesta", tone: "neutral" },
  busy: { label: "Ocupado", tone: "warning" },
  failed: { label: "Fallida", tone: "destructive" },
  canceled: { label: "Cancelada", tone: "neutral" },
};

/** Desenlaces de negocio (columna `outcome`). La escala semántica vive fuera
 * de la marca: el coral de axi jamás significa error. `hangup` es «colgó el
 * cliente»; los cierres decididos por el sistema tienen etiqueta propia
 * (hardening P0.2) — antes todos se veían como «Colgó». El `Record` sobre el
 * enum del contrato obliga a etiquetar cada valor nuevo. */
const OUTCOME_ENTRIES: Record<CallOutcome, StatusMap[string]> = {
  goal_met: { label: "Objetivo cumplido", tone: "success" },
  callback_requested: { label: "Pidió callback", tone: "info" },
  voicemail: { label: "Buzón de voz", tone: "warning" },
  hangup: { label: "Colgó", tone: "neutral" },
  no_answer: { label: "Sin respuesta", tone: "neutral" },
  error: { label: "Error", tone: "destructive" },
  transferred: { label: "Transferida", tone: "info" },
  agent_closed: { label: "Cerrada por el agente", tone: "neutral" },
  silence_timeout: { label: "Sin respuesta en línea", tone: "warning" },
  max_duration: { label: "Tiempo máximo", tone: "info" },
  quota_exhausted: { label: "Cuota agotada", tone: "warning" },
  system_error: { label: "Error del sistema", tone: "destructive" },
};
export const CALL_OUTCOME_MAP: StatusMap = OUTCOME_ENTRIES;

/** Estados en los que la llamada sigue VIVA (espejo del backend F4-A). */
const LIVE_STATUSES: ReadonlySet<CallSessionStatus> = new Set([
  "queued",
  "initiated",
  "ringing",
  "in_progress",
]);

export function isLiveCallStatus(status: CallSessionStatus): boolean {
  return LIVE_STATUSES.has(status);
}

/**
 * El pill de "Resultado" de la tabla: el desenlace si ya existe; si no, el
 * estado del ciclo de vida (una llamada viva aún no tiene desenlace).
 */
export function callResultBadge(row: {
  status: CallSessionStatus;
  outcome: CallSessionRowDTO["outcome"];
}): { status: string; map: StatusMap } {
  if (row.outcome !== null) return { status: row.outcome, map: CALL_OUTCOME_MAP };
  return { status: row.status, map: CALL_STATUS_MAP };
}

/** Fila PLANA para DataTable (DataRow exige primitivos). */
export type CallRow = {
  id: string;
  direction: CallDirection;
  contact_id: string | null;
  contact_name: string | null;
  phone: string;
  purpose: CallPurpose;
  agent: string | null;
  status: CallSessionStatus;
  outcome: CallSessionRowDTO["outcome"];
  duration_seconds: number | null;
  cost_estimate_usd: number | null;
  has_recording: boolean;
  attempt: number;
  created_at: string;
};

export function mapSessionToRow(dto: CallSessionRowDTO): CallRow {
  return {
    id: dto.id,
    direction: dto.direction,
    contact_id: dto.contact?.id ?? null,
    contact_name: dto.contact?.name ?? null,
    // El teléfono del CLIENTE: en salientes es el destino, en entrantes el origen
    phone: dto.direction === "outbound" ? dto.to_number : dto.from_number,
    purpose: dto.purpose,
    agent: dto.ai_agent_name,
    status: dto.status,
    outcome: dto.outcome,
    duration_seconds: dto.duration_seconds,
    cost_estimate_usd: dto.cost_estimate_usd,
    has_recording: dto.has_recording,
    attempt: dto.attempt,
    created_at: dto.created_at,
  };
}

/** Desglose de latencia de un turno (payload de `turn_completed`, plan §3.4).
 * Lo emite el backend como JSON libre; este parser defensivo es el contrato
 * del popover: campo ilegible = se omite, jamás revienta el transcript. */
export type TurnLatency = {
  total_turn_ms?: number;
  first_response_ms?: number;
  runtime_queue_ms?: number;
  llm_first_token_ms?: number;
  llm_total_ms?: number;
  tool_ms?: number;
  tools?: { name: string; ms: number }[];
  llm_iterations?: number;
  filler_sent?: boolean;
  interrupted?: boolean;
};

export function parseTurnLatency(payload: unknown): TurnLatency | null {
  if (payload === null || typeof payload !== "object") return null;
  const latency = (payload as { latency?: unknown }).latency;
  if (latency === null || typeof latency !== "object") return null;
  const raw = latency as Record<string, unknown>;
  const num = (key: string): number | undefined =>
    typeof raw[key] === "number" && Number.isFinite(raw[key] as number)
      ? (raw[key] as number)
      : undefined;
  const tools = Array.isArray(raw.tools)
    ? (raw.tools as unknown[]).flatMap((tool) => {
        if (tool === null || typeof tool !== "object") return [];
        const entry = tool as { name?: unknown; ms?: unknown };
        if (typeof entry.name !== "string" || typeof entry.ms !== "number") return [];
        return [{ name: entry.name, ms: entry.ms }];
      })
    : undefined;
  return {
    total_turn_ms: num("total_turn_ms"),
    first_response_ms: num("first_response_ms"),
    runtime_queue_ms: num("runtime_queue_ms"),
    llm_first_token_ms: num("llm_first_token_ms"),
    llm_total_ms: num("llm_total_ms"),
    tool_ms: num("tool_ms"),
    tools,
    llm_iterations: num("llm_iterations"),
    filler_sent: raw.filler_sent === true,
    interrupted: raw.interrupted === true,
  };
}
