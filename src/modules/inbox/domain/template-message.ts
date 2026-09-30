import type { MessageStatus } from "./inbox";

/**
 * Mensajes de plantilla de Meta dentro del hilo (hotfix 2026-09-29).
 *
 * Una plantilla enviada llega con `body: null`: su contenido vive en
 * `payload.template.{name, language, components}` con los VALORES de cada hueco,
 * no con el texto. El texto se reconstruye con el catálogo del canal
 * (`renderHsmPreview`); aquí solo se leen los datos con que salió.
 */
export type SentTemplate = {
  name: string;
  language: string;
  /** Valores de `{{1}}`, `{{2}}`… del cuerpo, en orden. */
  bodyParams: string[];
  /** Valores de la cabecera de texto, si la plantilla los pide. */
  headerParams: string[];
  /** La cabecera se envió con imagen, video o documento. */
  headerMedia: boolean;
};

function textParams(parameters: unknown): string[] {
  if (!Array.isArray(parameters)) return [];
  return parameters.flatMap((raw) => {
    if (typeof raw !== "object" || raw === null) return [];
    const text = (raw as { text?: unknown }).text;
    return typeof text === "string" ? [text] : [];
  });
}

/** Lee `payload.template`. Mismo patrón defensivo que `extractInteractivePayload`. */
export function extractTemplatePayload(payload: unknown): SentTemplate | null {
  if (typeof payload !== "object" || payload === null) return null;
  const template = (payload as { template?: unknown }).template;
  if (typeof template !== "object" || template === null) return null;
  const { name, language, components } = template as Record<string, unknown>;
  if (typeof name !== "string" || name.length === 0) return null;

  let bodyParams: string[] = [];
  let headerParams: string[] = [];
  let headerMedia = false;
  if (Array.isArray(components)) {
    for (const raw of components) {
      if (typeof raw !== "object" || raw === null) continue;
      const item = raw as { type?: unknown; parameters?: unknown };
      const type = typeof item.type === "string" ? item.type.toLowerCase() : "";
      if (type === "body") bodyParams = textParams(item.parameters);
      if (type === "header") {
        headerParams = textParams(item.parameters);
        headerMedia =
          Array.isArray(item.parameters) &&
          item.parameters.some((p) => {
            const kind = (p as { type?: unknown } | null)?.type;
            return kind === "image" || kind === "video" || kind === "document";
          });
      }
    }
  }
  return { name, language: typeof language === "string" ? language : "", bodyParams, headerParams, headerMedia };
}

/** `payload.resent_from`: el id del mensaje fallido del que este es el reenvío. */
export function resentFrom(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const value = (payload as { resent_from?: unknown }).resent_from;
  return typeof value === "string" ? value : null;
}

/** `payload.resent_by_user_id`: quién pulsó «Reenviar» (el reenvío conserva el `sender_type` del original). */
export function resentByOf(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const value = (payload as { resent_by_user_id?: unknown }).resent_by_user_id;
  return typeof value === "string" ? value : null;
}

/**
 * El error de un mensaje fallido. Llega con dos formas:
 * - el envío síncrono (`markFailed`): `{ code: "channels/…", detail }`;
 * - el webhook de Meta: `{ code: 131042, title, details }`.
 */
export type MessageFailure = { code: string | null; title: string | null; detail: string | null };

export function parseMessageError(error: unknown): MessageFailure | null {
  if (typeof error !== "object" || error === null) return null;
  const record = error as Record<string, unknown>;
  // El código de Meta del rechazo síncrono (`provider_code`, de Graph) manda
  // sobre el de plataforma, igual que en la tarea del CRM.
  const raw = record.provider_code ?? record.code;
  const code = typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw : null;
  const title = typeof record.title === "string" ? record.title : null;
  const rawDetail = record.details ?? record.detail;
  const detail = typeof rawDetail === "string" ? rawDetail : null;
  if (code === null && title === null && detail === null) return null;
  return { code, title, detail };
}

/**
 * Qué pasó, por código. ESPEJO EXACTO de `opening_rejection.ts` del servidor
 * (auditoría M6): el mismo fallo se dice igual en el chat, en Programados y en
 * la campanita. En minúscula como allí; `failureCopy` lo convierte en frase.
 */
const META_FAILURE_DETAIL: Record<string, string> = {
  "131042": "Meta no cobró el envío: revisa el método de pago de tu cuenta de WhatsApp Business",
  "131026": "el número no pudo recibir el mensaje (puede que no tenga WhatsApp)",
  "131031": "Meta bloqueó temporalmente la cuenta de WhatsApp Business",
  "131047": "pasaron más de 24 h desde su último mensaje: solo se le puede escribir con una plantilla",
  "131048": "Meta limitó los envíos de este número por reportes de spam",
  "131049": "Meta frenó el envío para cuidar la experiencia del destinatario",
  "131050": "el contacto pidió no recibir mensajes de marketing en WhatsApp",
  "131051": "Meta no admite este tipo de mensaje",
  "131056": "se le enviaron demasiados mensajes seguidos a este contacto; espera un poco y reenvía",
  "130472": "Meta retuvo el mensaje por un experimento suyo con este contacto",
  "132000": "a la plantilla le faltaron datos: revisa sus huecos",
  "132001": "la plantilla no existe en Meta con ese nombre e idioma",
  "132015": "Meta pausó la plantilla por su calidad",
  "132016": "Meta desactivó la plantilla",
  "131000": "Meta tuvo un error al enviarlo; reenvíalo en unos minutos",
  "131016": "Meta tuvo un error al enviarlo; reenvíalo en unos minutos",
};

/** Fallos de NUESTRO pipeline: no los rechazó Meta y no se dicen así. */
const PLATFORM_FAILURE_DETAIL: Record<string, string> = {
  "channels/invalid_credentials": "la conexión con WhatsApp venció: vuelve a conectar el canal",
  "channels/provider_error": "WhatsApp no respondió al enviarla; reenvíala en unos minutos",
  "channels/send_failed": "no se pudo enviar por el canal de WhatsApp",
  "channels/not_connected": "el canal de WhatsApp no está conectado",
  "usage/limit_exceeded": "se agotó el cupo de mensajes del plan",
  "auth/company_suspended": "la cuenta está suspendida: no salen mensajes",
  "conversations/message_not_found": "el contacto no tiene un número de WhatsApp al que escribirle",
  "conversations/handoff_conflict": "un asesor tomó la conversación antes de que saliera",
};

const META_GENERIC = "Meta no la entregó; reenvíala y, si vuelve a fallar, revisa tu cuenta de WhatsApp Business";
const PLATFORM_GENERIC = "no se pudo enviar por un error de la plataforma; reenvíala en unos minutos";

/** El motivo por código, sin enseñar nunca el código crudo (queda en `message.error`). */
export function failureDetail(code: string | null): string {
  if (code === null || code === "" || /^\d+$/.test(code)) {
    return (code ? META_FAILURE_DETAIL[code] : undefined) ?? META_GENERIC;
  }
  return PLATFORM_FAILURE_DETAIL[code] ?? PLATFORM_GENERIC;
}

/** Una frase: primera en mayúscula y punto final. Sirve también para el `detail` del servidor. */
export function asSentence(text: string): string {
  const sentence = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

/**
 * Qué pasó, en español y con lo que hay que hacer. `errorCode` es el
 * `error_code` del evento en vivo: sirve cuando el mensaje aún no trae `error`.
 */
export function failureCopy(failure: MessageFailure | null, errorCode: string | null = null): string {
  return asSentence(failureDetail(failure?.code ?? errorCode));
}

/**
 * Orden de la entrega. Un recibo tardío no hace retroceder lo ya visto
 * (`delivered` después de `read`); `failed` manda siempre, porque Meta puede
 * rechazar después de aceptar — es exactamente el incidente del 2026-09-29.
 */
const DELIVERY_RANK: Partial<Record<MessageStatus, number>> = { queued: 0, sent: 1, delivered: 2, read: 3 };

export function mergeDeliveryStatus(current: MessageStatus, incoming: MessageStatus): MessageStatus {
  if (incoming === "failed") return "failed";
  if (current === "failed") return current;
  const from = DELIVERY_RANK[current];
  const to = DELIVERY_RANK[incoming];
  if (from === undefined || to === undefined) return incoming;
  return to > from ? incoming : current;
}

/** El estado en palabras, junto a la hora de la burbuja de una plantilla. */
export function deliveryLabel(status: MessageStatus, pending: boolean): string | null {
  if (pending || status === "queued") return "Enviando";
  if (status === "sent") return "Enviada";
  if (status === "delivered") return "Entregada";
  if (status === "read") return "Leída";
  return null;
}
