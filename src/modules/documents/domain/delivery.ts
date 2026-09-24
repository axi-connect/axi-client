import type { Schemas } from "@/core/api/types";
import { relativeTime } from "@/core/lib/relative-time";
import type { DocumentDTO } from "./document";

/**
 * Dominio de la ENTREGA de un documento (F9 Cobros): alias del contrato
 * generado y las lecturas puras que la fila, el diálogo y los ajustes
 * comparten.
 *
 * La idea que ordena todo: **el diálogo dice lo mismo que hará el motor**. El
 * servidor calcula el preflight (`send-options`) con las mismas fuentes con
 * las que manda —alcanzabilidad real del contacto, plantilla de respaldo,
 * correo de la ficha— y el cliente lo LEE. Aquí no se recalcula la ventana de
 * 24 h ni se infiere nada: cada rama viene decidida en el DTO.
 */
export type DocumentDeliveryDTO = NonNullable<
  DocumentDTO["last_delivery"]["whatsapp"]
>;
export type DocumentDetailDTO = Schemas["DocumentDetailDto"];
export type DocumentSendOptionsDTO = Schemas["DocumentSendOptionsDto"];
export type SendDocumentDTO = Schemas["SendDocumentDto"];
export type SendDocumentResultDTO = Schemas["SendDocumentResultDto"];

export type DeliveryChannel = DocumentDeliveryDTO["channel"];
export type DeliveryStatus = DocumentDeliveryDTO["status"];

export const CHANNEL_LABELS: Record<DeliveryChannel, string> = {
  whatsapp: "WhatsApp",
  email: "correo",
};

/**
 * `delivered` está en el enum por paridad con el servidor, pero es
 * INALCANZABLE: Meta no publica ese estado al bus (coste ×3). Se lee como
 * «enviado» si algún día llega; no se promete.
 */
export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  queued: "Enviando",
  sent: "Enviado",
  delivered: "Enviado",
  failed: "No se pudo enviar",
  skipped: "No salió",
};

/**
 * Por qué un envío no salió — espejo de los `skip_reason` del dispatcher y del
 * notifier del servidor. El wire los manda como string libre: lo que no esté
 * aquí cae a una frase genérica, nunca al código crudo.
 */
export type DeliverySkipReason =
  | "outside_service_window_no_hsm"
  | "contact_without_email"
  | "no_channel"
  | "channel_not_found"
  | "channel_not_connected"
  | "no_contact_identity"
  | "unsupported_channel_kind"
  | "unsupported_content"
  | "file_too_large"
  | "email_provider_disabled"
  | "document_not_rendered"
  | "document_superseded"
  | "feature_disabled"
  | "no_counterparty"
  | "contact_not_found";

export const DELIVERY_SKIP_LABELS: Record<DeliverySkipReason, string> = {
  outside_service_window_no_hsm:
    "no ha escrito en más de 24 h y no hay plantilla aprobada",
  contact_without_email: "no tiene correo en su ficha",
  no_channel: "no tiene un canal de WhatsApp por el que escribirle",
  channel_not_found: "el canal de WhatsApp ya no existe",
  channel_not_connected: "el canal de WhatsApp está desconectado",
  no_contact_identity: "no tiene número en ese canal",
  unsupported_channel_kind: "el canal del contacto no admite este envío",
  unsupported_content: "el canal del contacto no permite mandar archivos",
  file_too_large: "el PDF pesa más de lo que el canal admite",
  email_provider_disabled: "el correo saliente no está configurado",
  document_not_rendered: "el PDF no estaba listo",
  document_superseded: "el documento fue reemplazado antes de salir",
  feature_disabled: "la función de documentos está apagada",
  no_counterparty: "el documento no está a nombre de nadie",
  contact_not_found: "el contacto ya no existe",
};

/** Por qué un envío FALLÓ (≠ omitido): el proveedor lo rechazó o no respondió. */
export type DeliveryErrorCode =
  | "provider_failed"
  | "email_provider_error"
  | "dispatch_error"
  | "delivery_timeout";

export const DELIVERY_ERROR_LABELS: Record<DeliveryErrorCode, string> = {
  provider_failed: "WhatsApp lo rechazó",
  email_provider_error: "el servicio de correo no respondió",
  dispatch_error: "falló al prepararlo",
  delivery_timeout: "el proveedor no confirmó a tiempo",
};

/** Tono de la línea: texto, nunca fondo. `busy` late mientras sale. */
export type DeliveryTone = "ok" | "busy" | "bad" | "warn";

export function deliveryTone(status: DeliveryStatus): DeliveryTone {
  switch (status) {
    case "queued":
      return "busy";
    case "sent":
    case "delivered":
      return "ok";
    case "failed":
      return "bad";
    case "skipped":
      return "warn";
  }
}

/**
 * La tercera línea de la fila, por canal. `text` es el hecho («Enviado por
 * WhatsApp»), `detail` lo que lo acompaña (a quién, por qué no), `at` cuándo
 * se resolvió, y `retry` qué salida ofrece la fila: repetir por el mismo canal,
 * probar por correo (WhatsApp cerrado sin plantilla) o ninguna.
 */
export type DeliveryLine = {
  channel: DeliveryChannel;
  tone: DeliveryTone;
  text: string;
  detail: string | null;
  at: string | null;
  retry: "same" | "email" | null;
};

export function skipReasonLabel(reason: string | null): string {
  return reason !== null && reason in DELIVERY_SKIP_LABELS
    ? DELIVERY_SKIP_LABELS[reason as DeliverySkipReason]
    : "no se pudo mandar por aquí";
}

function errorLabel(code: string | null): string | null {
  return code !== null && code in DELIVERY_ERROR_LABELS
    ? DELIVERY_ERROR_LABELS[code as DeliveryErrorCode]
    : null;
}

export function deliveryLine(delivery: DocumentDeliveryDTO): DeliveryLine {
  const channel = CHANNEL_LABELS[delivery.channel];
  const tone = deliveryTone(delivery.status);
  const at = delivery.resolved_at ?? delivery.queued_at ?? delivery.created_at;
  switch (delivery.status) {
    case "queued":
      return {
        channel: delivery.channel,
        tone,
        text: `Enviando por ${channel}…`,
        detail: null,
        at: null,
        retry: null,
      };
    case "sent":
    case "delivered":
      if (delivery.content_kind === "hsm_notice") {
        return {
          channel: delivery.channel,
          tone,
          text: `Salió el aviso por ${channel}`,
          detail: "el PDF llega cuando responda",
          at,
          retry: null,
        };
      }
      return {
        channel: delivery.channel,
        tone,
        text: `Enviado por ${channel}`,
        detail:
          delivery.channel === "email" && delivery.recipient_masked !== null
            ? `a ${delivery.recipient_masked}`
            : null,
        at,
        retry: null,
      };
    case "failed":
      return {
        channel: delivery.channel,
        tone,
        text: `No se pudo enviar por ${channel}`,
        detail: errorLabel(delivery.error_code),
        at,
        retry: "same",
      };
    case "skipped":
      return {
        channel: delivery.channel,
        tone,
        text: `No salió por ${channel}`,
        detail: skipReasonLabel(delivery.skip_reason),
        at,
        retry: skipRetry(delivery),
      };
  }
}

/**
 * Qué salida tiene un envío omitido. La ventana cerrada sin plantilla tiene
 * una alternativa clara (el correo); un canal caído se puede repetir; lo que
 * depende de la ficha o del archivo no se arregla desde la fila.
 */
function skipRetry(delivery: DocumentDeliveryDTO): DeliveryLine["retry"] {
  switch (delivery.skip_reason) {
    case "outside_service_window_no_hsm":
      return delivery.channel === "whatsapp" ? "email" : null;
    case "channel_not_connected":
    case "email_provider_disabled":
    case "document_not_rendered":
      return "same";
    default:
      return null;
  }
}

/** Las líneas de la fila: WhatsApp y luego correo, solo las que existen. */
export function deliveryLines(
  document: Pick<DocumentDTO, "last_delivery">,
): DeliveryLine[] {
  const lines: DeliveryLine[] = [];
  const { whatsapp, email } = document.last_delivery;
  if (whatsapp !== null) lines.push(deliveryLine(whatsapp));
  if (email !== null) lines.push(deliveryLine(email));
  return lines;
}

/** Solo un PDF listo se envía; lo generando, fallido o reemplazado, no. */
export function canSend(document: Pick<DocumentDTO, "status">): boolean {
  return document.status === "rendered";
}

// ───────────────────────── El diálogo lee `send-options` ─────────────────────

/**
 * Lo que la tarjeta y el aviso de WhatsApp dicen, decidido por las CUATRO
 * ramas que el servidor ya calculó:
 * - `open`: ventana abierta → el PDF le llega al chat.
 * - `hsm`: fuera de ventana con plantilla → sale el aviso y el PDF al responder.
 * - `no_hsm`: fuera de ventana sin plantilla → no se puede; configurar o correo.
 * - `unreachable`: no hay canal (sin número, canal caído, sin contacto).
 */
export type WhatsappMode = "open" | "hsm" | "no_hsm" | "unreachable";

export type ChannelAvailability = {
  enabled: boolean;
  /** La segunda línea de la tarjeta: destino enmascarado o la razón escrita. */
  summary: string;
};

export type WhatsappAvailability = ChannelAvailability & {
  mode: WhatsappMode;
  notice: {
    tone: "ok" | "info" | "warn";
    text: string;
    /** Solo en `no_hsm` y solo si quien mira puede configurar plantillas. */
    configureLink: boolean;
  } | null;
};

const UNREACHABLE_REASONS: Partial<Record<string, string>> = {
  no_counterparty: "Este documento no está a nombre de nadie.",
  no_channel: "No tiene un canal de WhatsApp por el que escribirle.",
  channel_not_found: "El canal de WhatsApp ya no existe.",
  channel_not_connected: "El canal de WhatsApp está desconectado.",
  no_contact_identity: "No tiene número en el canal de WhatsApp.",
  unsupported_channel_kind: "Su canal no admite este envío.",
};

export function whatsappAvailability(
  options: DocumentSendOptionsDTO,
  canConfigure: boolean,
  now: Date = new Date(),
): WhatsappAvailability {
  const wa = options.whatsapp;
  const to = wa.recipient_masked ?? "WhatsApp";
  const since =
    wa.last_inbound_at === null ? null : relativeTime(wa.last_inbound_at, now);

  if (options.contact === null || !wa.reachable) {
    return {
      enabled: false,
      mode: "unreachable",
      summary:
        UNREACHABLE_REASONS[wa.reason ?? ""] ??
        "No se le puede escribir por WhatsApp ahora.",
      notice: null,
    };
  }
  if (wa.window_open) {
    return {
      enabled: true,
      mode: "open",
      summary: since === null ? to : `${to} · escribió ${since}`,
      notice: {
        tone: "ok",
        text: `${since === null ? "La ventana de 24 h está abierta" : `Escribió ${since}: la ventana de 24 h está abierta`} y el PDF le llega al chat, con una línea que lo presenta.`,
        configureLink: false,
      },
    };
  }
  // `reachable` sin ventana = fuera de las 24 h: el servidor ya dijo si hay plantilla.
  if (wa.fallback === "hsm") {
    return {
      enabled: true,
      mode: "hsm",
      summary:
        since === null
          ? `${to} · no ha escrito`
          : `${to} · su último mensaje fue ${since}`,
      notice: {
        tone: "info",
        text: `Lleva más de 24 h sin escribir, así que WhatsApp no deja mandar el PDF directo. Le llegará la plantilla «${wa.hsm_name ?? ""}» y el PDF sale solo cuando responda.`,
        configureLink: false,
      },
    };
  }
  return {
    enabled: false,
    mode: "no_hsm",
    summary:
      "No ha escrito en más de 24 h y no hay una plantilla aprobada configurada.",
    notice: {
      tone: "warn",
      text: "Fuera de las 24 h, WhatsApp solo deja salir una plantilla aprobada de Meta.",
      configureLink: canConfigure,
    },
  };
}

/**
 * La ficha es la única dirección de registro: sin correo allí, la tarjeta se
 * deshabilita con la salida honesta y no hay campo para inventarse una.
 */
export function emailAvailability(
  options: DocumentSendOptionsDTO,
): ChannelAvailability {
  const address = options.email.address_masked;
  if (options.contact === null) {
    return {
      enabled: false,
      summary: UNREACHABLE_REASONS.no_counterparty ?? "",
    };
  }
  if (address === null) {
    return {
      enabled: false,
      summary:
        "No tiene correo en su ficha. Añádelo en el contacto para mandarlo por aquí.",
    };
  }
  return { enabled: true, summary: address };
}

/** El canal que el diálogo marca al abrir: el pedido, si se puede; si no, el otro. */
export function defaultChannel(
  options: DocumentSendOptionsDTO,
  preferred: DeliveryChannel | undefined,
  canConfigure: boolean,
): DeliveryChannel | null {
  const enabled: Record<DeliveryChannel, boolean> = {
    whatsapp: whatsappAvailability(options, canConfigure).enabled,
    email: emailAvailability(options).enabled,
  };
  if (preferred !== undefined && enabled[preferred]) return preferred;
  if (enabled.whatsapp) return "whatsapp";
  if (enabled.email) return "email";
  return null;
}
