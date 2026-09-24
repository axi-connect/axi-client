/**
 * Dominio de las sesiones de simulacro interactivo (upgrade quality F1).
 * TypeScript PURO: estados, etiquetas, la regla de cómo viaja un toque y los
 * mensajes de los 409 de negocio. Los tipos salen del contrato generado.
 */
import type { Schemas } from "@/core/api/types";

export type SessionSummary = Schemas["QualitySessionsPageDto"]["data"][number];
export type SessionDetail = Schemas["QualitySessionDetailDto"];
export type SessionMessage = SessionDetail["transcript"][number];
export type SessionInteractiveOption = NonNullable<SessionMessage["interactive"]>["options"][number];
export type SessionAgentState = SessionDetail["agent_state"];
export type SessionEndReason = NonNullable<SessionSummary["ended_reason"]>;
export type SessionTrace = Schemas["QualitySessionTraceDto"];
export type SessionTraceEntry = SessionTrace["turns"][number];
export type SessionTraceTurn = Extract<SessionTraceEntry, { kind: "agent_turn" }>;
export type CreateSessionDTO = Schemas["CreateQualitySessionDto"];
export type SendSessionMessageDTO = Schemas["SendQualitySessionMessageDto"];
export type TenantAgent = Schemas["PlatformTenantAgentsDto"]["data"][number];
export type SessionAttachment = SessionMessage["attachments"][number];
export type SessionRecognition = NonNullable<SessionMessage["recognition"]>;
export type SessionTranscription = NonNullable<SessionMessage["transcription"]>;

// ─── Límites del contrato (quality.config.ts del backend) ────────────────────

/** Tope por sesión que el server aplica por defecto y máximo aceptado por el DTO. */
export const SESSION_CAP_USD_DEFAULT = 1;
export const SESSION_CAP_USD_MAX = 20;
export const PERSONA_NOTE_MAX = 500;
export const MESSAGE_BODY_MAX = 4000;
/** Minutos sin mensaje del operador tras los que el server cierra la sesión. */
export const SESSION_IDLE_TIMEOUT_MIN = 30;

// ─── Estado ──────────────────────────────────────────────────────────────────

/** ¿El operador puede escribir? Activa y no escalada ni cerrada por el agente. */
export function canOperatorSend(session: Pick<SessionDetail, "status" | "agent_state">): boolean {
  return session.status === "active" && session.agent_state !== "closed";
}

export const END_REASON_LABELS: Record<SessionEndReason, string> = {
  operator: "Finalizada por ti",
  idle_timeout: "Cerrada por inactividad",
  max_age: "Cerrada por edad máxima",
  spend_cap: "Tope de la sesión",
  daily_spend_cap: "Tope diario global",
  closed_by_agent: "El agente cerró la conversación",
  failed: "No llegó a abrirse",
};

export const AGENT_STATE_LABELS: Record<SessionAgentState, string> = {
  idle: "Esperando",
  thinking: "Escribiendo…",
  escalated: "Escalada a humano",
  closed: "Cerrada",
};

/** Etiqueta corta del estado de una sesión para chips y listas. */
export function sessionStatusLabel(session: Pick<SessionSummary, "status" | "ended_reason">): string {
  if (session.status === "active") return "Activa";
  return session.ended_reason ? END_REASON_LABELS[session.ended_reason] : "Terminada";
}

/** Semáforo del chip: activa → ámbar con spinner; fin normal → verde; por tope → ámbar; fallo → rojo. */
export function sessionStatusKey(session: Pick<SessionSummary, "status" | "ended_reason">): string {
  if (session.status === "active") return "running";
  switch (session.ended_reason) {
    case "operator":
    case "closed_by_agent":
      return "completed";
    case "spend_cap":
    case "daily_spend_cap":
      return "blocked";
    case "idle_timeout":
    case "max_age":
      return "timeout";
    case "failed":
      return "failed";
    default:
      return "canceled";
  }
}

// ─── Medios (F2) ─────────────────────────────────────────────────────────────

/** Tope del adjunto del operador (coincide con `interactive_media_max_bytes`). */
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export function isImageAttachment(attachment: Pick<SessionAttachment, "mime_type">): boolean {
  return attachment.mime_type.startsWith("image/");
}

export function isAudioAttachment(attachment: Pick<SessionAttachment, "mime_type">): boolean {
  return attachment.mime_type.startsWith("audio/");
}

const SKIP_REASON_LABELS: Record<string, string> = {
  disabled: "Reconocimiento apagado en este tenant",
  quota: "Cuota de reconocimiento agotada",
  not_image: "El archivo no es una imagen legible",
  too_large: "Imagen demasiado grande para analizar",
};

const ERROR_REASON_LABELS: Record<string, string> = {
  vision_failed: "La visión falló",
  search_failed: "La búsqueda en el catálogo falló",
  timeout: "El reconocimiento agotó su tiempo",
  provider_error: "Error del proveedor de visión",
};

const CONFIDENCE_LABELS: Record<string, string> = { high: "alta", medium: "media", low: "baja" };

/** Qué decir del reconocimiento de una foto en una línea (chip de la burbuja). */
export function recognitionLabel(recognition: SessionRecognition): { text: string; tone: "ok" | "warn" | "off" } {
  if (recognition.status === "skipped") {
    return { text: SKIP_REASON_LABELS[recognition.skip_reason ?? ""] ?? "Reconocimiento omitido", tone: "warn" };
  }
  if (recognition.status === "failed") {
    return { text: ERROR_REASON_LABELS[recognition.error_reason ?? ""] ?? "Reconocimiento fallido", tone: "warn" };
  }
  const top = recognition.candidates[0];
  if (!top) {
    return { text: recognition.kind === "product" || recognition.kind === "screenshot_of_post" ? "Sin coincidencia en el catálogo" : "No es un producto", tone: "off" };
  }
  return { text: `Reconocido · confianza ${CONFIDENCE_LABELS[top.confidence] ?? top.confidence}`, tone: "ok" };
}

// ─── Toques ──────────────────────────────────────────────────────────────────

/**
 * Cómo lo habría pintado WhatsApp Cloud (`resolveInteractiveRendering`):
 * hasta 3 opciones sin descripción son botones; más, o con descripción, es
 * una lista. El server persiste la fuente tal cual, como haría el adapter.
 */
export function tapSourceFor(options: readonly SessionInteractiveOption[]): "button" | "list" {
  const needsList = options.length > 3 || options.some((option) => Boolean(option.description));
  return needsList ? "list" : "button";
}

/**
 * Solo el ÚLTIMO mensaje de la conversación, si es del agente y trae
 * opciones, sigue siendo tocable: en cuanto el operador escribe algo después,
 * el toque ya no se resolvería contra ese set (misma regla que la ingesta
 * aplica a un número suelto).
 */
export function lastTappableMessageId(transcript: readonly SessionMessage[]): string | null {
  const last = transcript.at(-1);
  if (!last || last.direction !== "outbound") return null;
  return last.interactive && last.interactive.options.length > 0 ? last.id : null;
}

/** Prefijo de las burbujas optimistas (aún sin id del servidor). */
export const OPTIMISTIC_ID_PREFIX = "pending-";

export function isOptimisticMessage(message: Pick<SessionMessage, "id">): boolean {
  return message.id.startsWith(OPTIMISTIC_ID_PREFIX);
}

/**
 * Id del último mensaje PERSISTIDO conocido, para pedir solo el delta
 * (`?after=`). Las burbujas optimistas no cuentan: su id no existe en el
 * servidor (B1 de la auditoría: mandarlo daba 400 en cada poll y el chat
 * se congelaba tras el primer envío).
 */
export function lastMessageId(transcript: readonly SessionMessage[]): string | undefined {
  for (let index = transcript.length - 1; index >= 0; index -= 1) {
    const message = transcript[index];
    if (message && isSettledMessage(message)) return message.id;
  }
  return undefined;
}

/**
 * Un mensaje está ASENTADO cuando ya no le va a llegar nada por detrás. Los
 * medios no lo están al nacer: el adjunto lo crea la ingesta después de
 * persistir el mensaje, y el reconocimiento / la transcripción los escribe un
 * job asíncrono sobre el MISMO mensaje. Si el cursor `?after=` avanzara sobre
 * uno de esos, el delta nunca volvería a traerlo y la burbuja se quedaría sin
 * foto ni chip para siempre (B2 de la auditoría). Un medio sin asentar deja el
 * cursor en el mensaje anterior: cada poll lo vuelve a traer hasta que cierre.
 */
export function isSettledMessage(message: SessionMessage, now: number = Date.now()): boolean {
  if (isOptimisticMessage(message)) return false;
  if (message.content_type === "image") {
    return message.attachments.length > 0 && (message.recognition !== null || isOldEnough(message, now));
  }
  if (message.content_type === "audio") {
    return message.attachments.length > 0 && (message.transcription !== null || isOldEnough(message, now));
  }
  if (message.content_type === "video" || message.content_type === "document") {
    return message.attachments.length > 0;
  }
  return true;
}

/**
 * N5: con el reconocimiento o el STT apagados en el tenant el mensaje nunca
 * recibe `recognition`/`transcription`; pasado un minuto con adjunto se da
 * por asentado para que el cursor no se quede clavado en él.
 */
export const MEDIA_SETTLE_GRACE_MS = 60_000;

function isOldEnough(message: Pick<SessionMessage, "created_at">, now: number): boolean {
  return now - new Date(message.created_at).getTime() > MEDIA_SETTLE_GRACE_MS;
}

/**
 * Fusiona un delta del transcript en el estado conocido. Un id que ya se
 * conocía se REEMPLAZA por la versión que llega (trae el adjunto, el
 * reconocimiento o la URL presignada nueva); los nuevos se anexan en orden.
 */
export function mergeTranscript(
  known: readonly SessionMessage[],
  incoming: readonly SessionMessage[],
): SessionMessage[] {
  if (incoming.length === 0) return [...known];
  const replacements = new Map(incoming.map((message) => [message.id, message]));
  const merged = known.map((message) => replacements.get(message.id) ?? message);
  const seen = new Set(known.map((message) => message.id));
  return [...merged, ...incoming.filter((message) => !seen.has(message.id))];
}

/**
 * Cada cuánto el poll vuelve a pedir el transcript COMPLETO aunque tenga
 * cursor: las URL presignadas de los adjuntos duran 5 min en el servidor y
 * el delta solo trae mensajes nuevos, así que sin esto las fotos viejas se
 * romperían a los 5 min (B2c).
 */
export const FULL_TRANSCRIPT_REFRESH_MS = 4 * 60 * 1000;

// ─── Formato ─────────────────────────────────────────────────────────────────

const USD = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return USD.format(value);
}

/** Porcentaje 0–100 del tope consumido (para la barra); null sin datos. */
export function spendPercent(spent: number | null | undefined, cap: number): number | null {
  if (spent === null || spent === undefined || cap <= 0) return null;
  return Math.min(100, Math.round((spent / cap) * 100));
}

export function formatLatency(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1).replace(".", ",")} s` : `${Math.round(ms)} ms`;
}

const TOKENS = new Intl.NumberFormat("es-CO");
export function formatTokens(value: number): string {
  return TOKENS.format(value);
}

// ─── Errores de negocio (RFC 7807 por `code`) ────────────────────────────────

type ProblemLike = { code?: string; detail?: string; details?: Record<string, unknown> } | null;

/**
 * Mensaje enriquecido para los 409 del simulacro: el tope, el límite de
 * sesiones y la sesión que ya terminó dicen qué pasó y qué hacer.
 */
export function describeSessionError(problem: ProblemLike): string | null {
  switch (problem?.code) {
    case "quality/session_spend_cap_exceeded": {
      const reason = problem.details?.reason;
      return reason === "daily_spend_cap"
        ? "El simulacro alcanzó el tope diario global de gasto: hoy no se pueden enviar más mensajes."
        : "La sesión alcanzó su tope de gasto y se cerró. Abre una nueva sesión si necesitas seguir.";
    }
    case "quality/session_limit_reached": {
      const scope = problem.details?.scope;
      return scope === "tenant"
        ? "Este tenant ya tiene el máximo de sesiones abiertas: finaliza una antes de abrir otra."
        : "Ya hay demasiadas sesiones de simulacro abiertas en la plataforma. Vuelve a intentarlo en unos minutos.";
    }
    case "quality/session_not_active":
      return problem.details?.reason === "closed_by_agent"
        ? "El agente cerró la conversación: la sesión terminó."
        : "La sesión ya terminó: abre una nueva para seguir probando.";
    case "quality/tenant_not_eligible":
      return problem.details?.reason === "suspended"
        ? "El tenant está suspendido: su pipeline no procesa mensajes."
        : "El agente elegido no está activo en este tenant.";
    default:
      return null;
  }
}
