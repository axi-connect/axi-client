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

/**
 * Mensajes interactivos (§9.1 del backend): botones, menú de lista o CTA de
 * URL. El tipo se DERIVA del contrato generado en vez de re-declararse — los
 * topes de Meta (13 opciones, títulos de 24, cuerpo de 1024) tienen una sola
 * fuente de verdad, y es el backend.
 */
export type InteractivePayload = NonNullable<SendMessageDTO["interactive"]>;
export type InteractiveOptions = Extract<InteractivePayload, { kind: "options" }>;
export type InteractiveOption = InteractiveOptions["options"][number];

/**
 * Respuesta del cliente a un interactivo, normalizada por la ingesta
 * (`payload.interactive_reply`). No viaja en el OpenAPI porque `payload` es
 * `unknown` en el contrato: se valida en runtime como el resto de parsers.
 */
export interface InteractiveReply {
  id: string;
  title: string;
  source: "button" | "list" | "quick_reply" | "numeric";
}

const INTERACTIVE_REPLY_SOURCES = new Set(["button", "list", "quick_reply", "numeric"]);

/** Etiqueta de cómo eligió el cliente — la lee el chip de la burbuja entrante. */
export const INTERACTIVE_REPLY_LABELS: Record<InteractiveReply["source"], string> = {
  button: "Botón",
  list: "Menú",
  quick_reply: "Respuesta rápida",
  numeric: "Respondió con el número",
};

/**
 * Lee `payload.interactive` de un mensaje saliente. Mismo patrón defensivo que
 * `extractLocationPayload`: el payload es `unknown` y un JSONB viejo o
 * corrupto no debe romper el hilo — devuelve `null` y la burbuja cae a texto.
 */
export function extractInteractivePayload(payload: unknown): InteractivePayload | null {
  if (typeof payload !== "object" || payload === null) return null;
  const interactive = (payload as { interactive?: unknown }).interactive;
  if (typeof interactive !== "object" || interactive === null) return null;
  const record = interactive as Record<string, unknown>;
  if (typeof record.body !== "string" || record.body.length === 0) return null;

  if (record.kind === "cta_url") {
    if (typeof record.label !== "string" || typeof record.url !== "string") return null;
    return { kind: "cta_url", body: record.body, label: record.label, url: record.url };
  }
  if (record.kind !== "options" || !Array.isArray(record.options)) return null;
  const options = record.options.flatMap((raw): InteractiveOption[] => {
    if (typeof raw !== "object" || raw === null) return [];
    const { id, title, description } = raw as Record<string, unknown>;
    if (typeof id !== "string" || typeof title !== "string") return [];
    return [{ id, title, ...(typeof description === "string" ? { description } : {}) }];
  });
  if (options.length === 0) return null;
  return {
    kind: "options",
    body: record.body,
    options,
    ...(typeof record.menu_label === "string" ? { menu_label: record.menu_label } : {}),
  };
}

/** Lee `payload.interactive_reply` de un mensaje entrante. */
export function extractInteractiveReply(payload: unknown): InteractiveReply | null {
  if (typeof payload !== "object" || payload === null) return null;
  const reply = (payload as { interactive_reply?: unknown }).interactive_reply;
  if (typeof reply !== "object" || reply === null) return null;
  const { id, title, source } = reply as Record<string, unknown>;
  if (typeof id !== "string" || typeof title !== "string") return null;
  if (typeof source !== "string" || !INTERACTIVE_REPLY_SOURCES.has(source)) return null;
  return { id, title, source: source as InteractiveReply["source"] };
}

/**
 * Lee `payload.media.catalog_sku` de un mensaje de imagen (F16): presente
 * cuando la foto la envió la IA desde el catálogo (`send_product_images`).
 * El payload es `unknown` en el contrato; se valida en runtime igual que
 * `extractLocationPayload`. Devuelve `null` si no aplica.
 */
export function extractCatalogSku(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const media = (payload as { media?: unknown }).media;
  if (typeof media !== "object" || media === null) return null;
  const sku = (media as { catalog_sku?: unknown }).catalog_sku;
  return typeof sku === "string" && sku.trim() ? sku : null;
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
  /**
   * Flag efímero de UI: media entrante cuyo attachment aún no persiste el
   * backend (la descarga corre en un job aparte). Mientras está activo se
   * muestra el skeleton en vez de "no disponible todavía". No proviene del
   * backend; lo gestiona `resolvePendingMedia` con reintentos.
   */
  media_pending?: boolean;
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

// -------------------------------------------- señales de la cabecera del chat

/**
 * ¿El contacto escribió lo último y sigue esperando respuesta?
 *
 * Se deriva comparando `last_inbound_at` con `last_message_at` por ORDEN, no por
 * igualdad: ambos los escribe el backend en operaciones distintas y no coinciden
 * al milisegundo aunque correspondan al mismo mensaje.
 */
export function isAwaitingReply(conversation: ConversationDTO): boolean {
  const { last_inbound_at, last_message_at } = conversation;
  if (last_inbound_at === null) return false;
  if (last_message_at === null) return true;
  return new Date(last_inbound_at).getTime() >= new Date(last_message_at).getTime();
}

/**
 * Instante desde el que el contacto espera respuesta, o `null` si no espera.
 * Devuelve el ISO crudo: el formateo relativo es de la UI — `domain/` es
 * TypeScript puro y no importa utilidades de `core/lib` (§3.3 regla 1).
 */
export function waitingSince(conversation: ConversationDTO): string | null {
  return isAwaitingReply(conversation) ? conversation.last_inbound_at : null;
}

/**
 * ¿La prioridad merece señal visual? Solo `high` y `urgent`: pintar un badge en
 * cada conversación `normal` es ruido, y `low` no aporta nada al operador.
 *
 * La prioridad es de SOLO LECTURA — el backend no expone forma de cambiarla; el
 * único escritor es el sweep de SLA vencido (`normal → high`).
 */
export function isNotablePriority(priority: ConversationDTO["priority"]): boolean {
  return priority === "high" || priority === "urgent";
}

/**
 * Nombre de archivo opaco del proveedor: WhatsApp entrega como `filename` el
 * JSON de media codificado en base64url (400+ chars, sin extensión ni puntos).
 * No es un nombre: mostrarlo ensancha modales y no informa de nada.
 */
const OPAQUE_FILENAME = /^[A-Za-z0-9_-]{40,}$/;

/** Extensión razonable a partir del mime (`image/jpeg` → `jpg`). */
function extensionForMime(mime: string): string | null {
  const subtype = (mime.split(";")[0] ?? "").split("/")[1]?.trim().toLowerCase();
  if (subtype === undefined || subtype === "") return null;
  if (subtype === "jpeg") return "jpg";
  if (subtype === "quicktime") return "mov";
  // `svg+xml`, `vnd.openxmlformats-...` → se queda el último segmento útil.
  return subtype.split("+")[0].split(".").pop() ?? null;
}

/**
 * Nombre presentable de un adjunto. Si el proveedor no mandó un nombre real
 * (vacío, o el token base64 de WhatsApp), se compone uno legible a partir del
 * tipo: "Foto.jpg", "Nota de voz.ogg", "Documento.pdf".
 *
 * Un nombre real se devuelve tal cual: recortarlo es cosa de CSS, no del dominio.
 */
export function attachmentDisplayName(attachment: {
  filename: string;
  mime_type: string;
}): string {
  const filename = attachment.filename?.trim() ?? "";
  if (filename !== "" && !OPAQUE_FILENAME.test(filename) && filename.length <= 120) {
    return filename;
  }

  const mime = attachment.mime_type?.toLowerCase() ?? "";
  const label = mime.startsWith("image/")
    ? MEDIA_PREVIEW_LABELS.image
    : mime.startsWith("video/")
      ? MEDIA_PREVIEW_LABELS.video
      : mime.startsWith("audio/")
        ? MEDIA_PREVIEW_LABELS.audio
        : MEDIA_PREVIEW_LABELS.document;

  const extension = extensionForMime(mime);
  return extension !== null ? `${label}.${extension}` : label;
}

// ------------------------------------------------- adjuntos del hilo (rail)

/**
 * Categorías del panel de adjuntos. `sticker` cae en `image` (se ve igual) y
 * `location` queda fuera: no hay archivo que listar ni descargar.
 */
export type AttachmentCategory = "image" | "video" | "audio" | "document";

export const ATTACHMENT_CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  image: "Imágenes",
  video: "Video",
  audio: "Audio",
  document: "Documentos",
};

/**
 * ¿El mensaje aporta un archivo al panel de adjuntos?
 *
 * Cubre tres situaciones: el mensaje ya tiene `attachments` persistidos, es un
 * optimista recién enviado que solo tiene `local_previews`, o es media entrante
 * cuyo attachment aún no materializa el backend (`media_pending`) — en ese
 * último caso interesa listarlo para mostrar el skeleton.
 */
export function isAttachmentMessage(message: UiMessage): boolean {
  if (message.content_type === "location") return false;
  return (
    message.attachments.length > 0 ||
    (message.local_previews?.length ?? 0) > 0 ||
    isMediaContentType(message.content_type)
  );
}

/**
 * Categoría del mensaje para filtrar el panel. Prioriza `content_type` (lo que
 * dijo el proveedor) y cae al mime del adjunto cuando no es un tipo de media
 * — p. ej. un `template` que llevaba una imagen.
 */
export function attachmentCategory(message: UiMessage): AttachmentCategory {
  switch (message.content_type) {
    case "image":
    case "sticker":
      return "image";
    case "video":
      return "video";
    case "audio":
      return "audio";
    case "document":
      return "document";
    default: {
      const mime = message.attachments[0]?.mime_type ?? message.local_previews?.[0]?.mime_type;
      const kind = mime !== undefined ? mediaKindForMime(mime) : null;
      return kind ?? "document";
    }
  }
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
