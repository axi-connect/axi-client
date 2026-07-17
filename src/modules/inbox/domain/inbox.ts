import type { Schemas } from "@/core/api/types";
import type { AudioTranscription } from "@/core/realtime/events";

export type { AudioTranscription };

/**
 * Contratos del slice inbox — bandeja operable de conversaciones
 * (`/inbox/*` + `/conversations/*`) con handoff humano ⇄ IA.
 */
export type ConversationDTO = Schemas["ConversationDto"];
export type InboxConversation = Schemas["InboxListDto"]["data"][number];
export type InboxCounts = Schemas["InboxCountsDto"];
export type Message = Schemas["ConversationMessagesDto"]["data"][number];
export type EnqueuedMessage = Schemas["EnqueuedMessageDto"];
export type ConversationEvent = Schemas["ConversationEventsDto"]["data"][number];
export type SendMessageDTO = Schemas["SendMessageDto"];

export type ConversationStatus = ConversationDTO["status"];
export type ConversationMode = ConversationDTO["mode"];
export type MessageStatus = Message["status"];
export type MessageContentType = Message["content_type"];
export type MessageAttachment = Message["attachments"][number];

/** Tipos de contenido que se renderizan como media (F9). */
export type MediaContentKind = "image" | "audio" | "video" | "document" | "sticker" | "location";

export const MEDIA_CONTENT_TYPES: ReadonlySet<MessageContentType> = new Set<MessageContentType>([
  "image",
  "audio",
  "video",
  "document",
  "sticker",
  "location",
]);

export function isMediaContentType(type: MessageContentType): type is MediaContentKind {
  return MEDIA_CONTENT_TYPES.has(type);
}

export const MEDIA_PREVIEW_LABELS: Record<MediaContentKind, string> = {
  image: "Foto",
  audio: "Nota de voz",
  video: "Video",
  document: "Documento",
  sticker: "Sticker",
  location: "Ubicación",
};

/**
 * `last_message_preview` del backend: el body/caption, o el token `[audio]`,
 * `[image]`… cuando la media no tiene texto. Traduce el token a etiqueta ES;
 * la UI le antepone el icono del tipo (patrón WhatsApp).
 */
export function parsePreview(preview: string | null): {
  kind: MediaContentKind | null;
  text: string;
} {
  if (!preview) return { kind: null, text: "…" };
  const trimmed = preview.trim();
  const match = /^\[(image|audio|video|document|sticker|location)\]$/.exec(trimmed);
  if (match) {
    const kind = match[1] as MediaContentKind;
    return { kind, text: MEDIA_PREVIEW_LABELS[kind] };
  }
  // Audio transcrito: el backend antepone 🎤 al texto. Se muestra con el icono
  // Mic (regla de marca: sin emojis en la UI de trabajo, DESIGN §7).
  if (trimmed.startsWith("🎤")) {
    return { kind: "audio", text: trimmed.slice("🎤".length).trim() };
  }
  return { kind: null, text: preview };
}

/** Shape del payload persistido por el backend para location (ingesta F4). */
export interface LocationPayload {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export function extractLocationPayload(payload: unknown): LocationPayload | null {
  if (typeof payload !== "object" || payload === null) return null;
  const location = (payload as { location?: unknown }).location;
  if (typeof location !== "object" || location === null) return null;
  const { latitude, longitude, name, address } = location as Record<string, unknown>;
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  return {
    latitude,
    longitude,
    name: typeof name === "string" ? name : undefined,
    address: typeof address === "string" ? address : undefined,
  };
}

/**
 * Lee `payload.transcription` de un mensaje de audio (STT). El payload es
 * `unknown` en el contrato; se valida en runtime igual que `extractLocationPayload`.
 * Devuelve `null` si no hay transcripción o el shape no es válido.
 */
export function extractTranscription(payload: unknown): AudioTranscription | null {
  if (typeof payload !== "object" || payload === null) return null;
  const transcription = (payload as { transcription?: unknown }).transcription;
  if (typeof transcription !== "object" || transcription === null) return null;
  const record = transcription as Record<string, unknown>;
  const { status, text } = record;
  if (status !== "done" && status !== "failed") return null;
  if (status === "done" && typeof text !== "string") return null;
  return {
    status,
    ...(typeof text === "string" ? { text } : {}),
    ...(typeof record.provider === "string" ? { provider: record.provider } : {}),
    ...(typeof record.model === "string" ? { model: record.model } : {}),
    ...(typeof record.audio_seconds === "number" ? { audio_seconds: record.audio_seconds } : {}),
    ...(typeof record.latency_ms === "number" ? { latency_ms: record.latency_ms } : {}),
    ...(typeof record.transcribed_at === "string" ? { transcribed_at: record.transcribed_at } : {}),
  };
}

/** Tabs de la bandeja: espejo de los contadores de `GET /inbox/counts`. */
export type InboxTab = "queued" | "mine" | "ai" | "all_open";

export const INBOX_TAB_LABELS: Record<InboxTab, string> = {
  queued: "En cola",
  mine: "Mías",
  ai: "IA",
  all_open: "Abiertas",
};

export const MODE_LABELS: Record<ConversationMode, string> = {
  ai_active: "IA",
  human_queued: "En cola",
  human_active: "Humano",
};

export const STATUS_LABELS: Record<ConversationStatus, string> = {
  open: "Abierta",
  snoozed: "Pospuesta",
  resolved: "Resuelta",
  closed: "Cerrada",
};

/**
 * Mensaje de la UI: un `Message` del backend o un optimista local aún sin
 * confirmar (`pending` hasta el ack / evento `conversation.message_sent`).
 */
export type UiMessage = Message & {
  /** Solo mensajes optimistas: id temporal local hasta reconciliar. */
  local_id?: string;
  delivery?: "pending" | "confirmed" | "failed";
  /** F9: previews locales (object URLs) del optimista antes del attachment real. */
  local_previews?: {
    object_url: string;
    mime_type: string;
    filename: string;
    size_bytes: number;
  }[];
  /** F9: DTO original del envío — retry de media sin re-subir el archivo. */
  local_payload?: SendMessageDTO;
  /**
   * Flag efímero de UI: audio inbound recibido en vivo cuya transcripción aún
   * no llega (`conversation.message_updated`). Enciende el indicador
   * "Transcribiendo…". No proviene del backend.
   */
  transcription_pending?: boolean;
};

// ---------------------------------------------------------------- envío F9

export type UploadResultDTO = Schemas["ConversationUploadDto"];
export type OutboundMediaKind = UploadResultDTO["media_kind"];

/** Adjunto del composer: File local + su ciclo de subida (use-upload-queue). */
export interface ComposerAttachment {
  local_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  /** URL.createObjectURL del File — preview local y burbuja optimista. */
  object_url: string;
  kind: OutboundMediaKind;
  status: "pending" | "uploading" | "uploaded" | "error";
  upload_id?: string;
  voice_note?: boolean;
}

/** Entrada única del envío (Composer → use-send-message). */
export type SendInput =
  | { kind: "text"; body: string }
  | {
      kind: "media";
      upload_id: string;
      caption?: string;
      preview: NonNullable<UiMessage["local_previews"]>[number];
      media_kind: OutboundMediaKind;
      voice_note?: boolean;
    };

/** Espejo de los límites del backend (media_kinds.ts): validación temprana. */
const MB = 1024 * 1024;

export const MAX_UPLOAD_BYTES: Record<OutboundMediaKind, number> = {
  image: 5 * MB,
  video: 16 * MB,
  audio: 16 * MB,
  document: 26 * MB,
};

export const ACCEPTED_MIME_BY_KIND: Record<OutboundMediaKind, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp"],
  video: ["video/mp4", "video/3gpp"],
  audio: ["audio/aac", "audio/mp4", "audio/mpeg", "audio/amr", "audio/ogg"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
  ],
};

/** `accept` del input file del composer (todos los kinds enviables). */
export const COMPOSER_ACCEPT = Object.values(ACCEPTED_MIME_BY_KIND).flat().join(",");

export function mediaKindForMime(mime: string): OutboundMediaKind | null {
  const base = (mime.split(";")[0] ?? mime).trim().toLowerCase();
  for (const kind of Object.keys(ACCEPTED_MIME_BY_KIND) as OutboundMediaKind[]) {
    if (ACCEPTED_MIME_BY_KIND[kind].includes(base)) return kind;
  }
  return null;
}

/** Filtros que la UI traduce a query params de `GET /inbox/conversations`. */
export function tabToQuery(tab: InboxTab): Record<string, string> {
  switch (tab) {
    case "queued":
      return { mode: "human_queued", status: "open" };
    case "mine":
      return { assigned: "me", status: "open" };
    case "ai":
      return { mode: "ai_active", status: "open" };
    case "all_open":
      return { status: "open" };
  }
}
