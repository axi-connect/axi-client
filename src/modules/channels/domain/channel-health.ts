import type { ChannelDTO } from "./channel";
import { channelProvider } from "./channel-providers";
import type { MetaOnboardingStatus } from "./meta-signup";

/**
 * Traducciones de la salud del canal (F4). TypeScript puro, sin React: vive en
 * `domain/` y la regla 1 de `architecture.md §3.3` lo exige.
 *
 * Todo lo que hay aquí existe por una razón: **los valores que sirve el backend
 * son enums de Meta**, y un tenant no técnico no puede hacer nada con `RED`,
 * `TIER_1K` o `awaiting_registration`. Un indicador que el usuario no entiende no
 * es un indicador, es ruido.
 *
 * Regla que gobierna el archivo: **ningún campo ausente se inventa**. Cuando el
 * backend manda `null`, la respuesta es "Sin datos" — nunca un valor plausible.
 * En una pantalla de salud, un dato falso es peor que un hueco.
 */

export type HealthTone = "good" | "warning" | "bad" | "neutral";

export type HealthReading = {
  label: string;
  tone: HealthTone;
  /** Explicación para que el indicador sea accionable, no decorativo. */
  hint?: string;
};

const SIN_DATOS: HealthReading = {
  label: "Sin datos",
  tone: "neutral",
  hint: "Meta todavía no ha reportado este dato. Aparece a las pocas horas de conectar el canal.",
};

/**
 * Calidad del número según Meta.
 *
 * El backend **normaliza** en un solo vocabulario: el alta escribe
 * `GREEN`/`YELLOW`/`RED` (el `quality_rating` de Graph) y el webhook
 * `phone_number_quality_update` trae `FLAGGED`/`UNFLAGGED`, que el processor de
 * salud traduce al mismo eje antes de guardarlo. Aquí solo hay que entender un
 * vocabulario; el estado de marcado vive en su propio campo del backend.
 *
 * Se aceptan igualmente `FLAGGED`/`UNFLAGGED` por si una fila anterior a esa
 * normalización sobrevive en la base: mostrar "Sin datos" justo cuando Meta marca
 * el número sería fallar en el único momento en que esta tarjeta importa.
 */
export function readQualityRating(value: string | null | undefined): HealthReading {
  const hint =
    "La califica Meta según cómo reaccionan quienes reciben tus mensajes: los bloqueos y los reportes la bajan.";

  switch (value?.toUpperCase()) {
    case "GREEN":
    case "UNFLAGGED":
      return { label: "Alta", tone: "good", hint };
    case "YELLOW":
      return { label: "Media", tone: "warning", hint };
    case "RED":
    case "FLAGGED":
      return { label: "Baja", tone: "bad", hint };
    case "UNKNOWN":
    case undefined:
    case "":
      return SIN_DATOS;
    default:
      return SIN_DATOS;
  }
}

/**
 * Límite de conversaciones que el canal puede INICIAR al día.
 *
 * Se dice en personas, no en tiers: `TIER_1K` no significa nada para quien vende
 * por WhatsApp, y "1.000 personas nuevas al día" sí.
 */
export function readMessagingLimit(value: string | null | undefined): HealthReading {
  const hint = "Es cuánta gente nueva puedes contactar tú. Sube solo si mantienes buena calidad.";

  if (value == null || value === "") return SIN_DATOS;

  const normalized = value.toUpperCase();
  if (normalized === "TIER_UNLIMITED" || normalized === "UNLIMITED") {
    return { label: "Sin límite", tone: "good", hint };
  }

  // `TIER_250`, `TIER_1K`, `TIER_10K`, `TIER_100K` y cualquier tier futuro con la
  // misma forma: se lee el número del propio valor en vez de mantener una tabla
  // que se queda corta cada vez que Meta añade un escalón.
  const match = /^TIER_(\d+)(K|M)?$/.exec(normalized);
  if (match !== null) {
    const base = Number(match[1]);
    const factor = match[2] === "M" ? 1_000_000 : match[2] === "K" ? 1_000 : 1;
    const people = base * factor;
    return {
      label: `${people.toLocaleString("es-CO")} personas nuevas al día`,
      tone: people <= 250 ? "warning" : "good",
      hint,
    };
  }

  // Un valor que no reconocemos se muestra tal cual antes que inventar uno: al
  // menos soporte puede leerlo del pantallazo del cliente
  return { label: value, tone: "neutral", hint };
}

/**
 * Acceso de Meta: es lo que decide si el canal puede RESPONDER.
 *
 * `credentials_revoked` manda sobre la fecha de caducidad: un token revocado a
 * mano en el Administrador comercial de Meta sigue teniendo `expires_at` en el
 * futuro, y mostrar "Vigente" ahí sería mentir en la única línea que explica por
 * qué no se pueden enviar mensajes.
 */
export function readMetaAccess(channel: ChannelDTO, now: Date = new Date()): HealthReading {
  if (channel.credentials_revoked) {
    return {
      label: "Revocado por Meta",
      tone: "bad",
      hint: "Hay que autorizar de nuevo para poder responder. Los mensajes entrantes siguen llegando.",
    };
  }
  if (!channel.credentials_configured) {
    return {
      label: "Sin configurar",
      tone: "warning",
      hint: "El canal existe pero todavía no tiene acceso para enviar mensajes.",
    };
  }
  if (channel.token_expires_at == null) {
    return {
      label: "Vigente",
      tone: "good",
      hint: "El acceso no tiene fecha de caducidad; lo renovamos solos si Meta la establece.",
    };
  }

  const days = daysBetween(now, new Date(channel.token_expires_at));
  if (days < 0) {
    return {
      label: "Caducado",
      tone: "bad",
      hint: "Renueva la conexión para volver a responder mensajes.",
    };
  }
  if (days <= 7) {
    return {
      label: days === 0 ? "Caduca hoy" : `Caduca en ${days} ${days === 1 ? "día" : "días"}`,
      tone: "warning",
      hint: "Renueva la conexión antes de que caduque para no interrumpir el servicio.",
    };
  }
  return {
    label: "Vigente",
    tone: "good",
    hint: `Caduca en ${days} días. Lo renovamos solos antes de esa fecha.`,
  };
}

/** Cómo se conectó el canal, en palabras del producto. */
export function readConnectionMethod(value: ChannelDTO["connection_method"]): string {
  switch (value) {
    case "embedded_signup":
      return "Con un botón";
    case "qr_pairing":
      return "Con código QR (canal retirado)";
    case "manual_token":
      return "Credenciales pegadas a mano";
    default:
      return "Sin datos";
  }
}

/**
 * Aviso pendiente del alta, si hay alguno.
 *
 * Devuelve `null` cuando no hay nada que decir: un banner permanente que dice
 * "todo bien" enseña al usuario a ignorar los banners.
 */
export function readOnboardingNotice(
  status: string | null | undefined,
): { title: string; detail: string; tone: "warning" | "info" } | null {
  const value = status as MetaOnboardingStatus | null | undefined;
  switch (value) {
    case "awaiting_registration":
      return {
        tone: "warning",
        title: "Falta confirmar el PIN del número",
        detail:
          "El canal ya recibe mensajes, pero no podrás iniciar conversaciones nuevas hasta completar este paso. Confírmalo desde las acciones del canal.",
      };
    case "awaiting_payment_method":
      return {
        tone: "info",
        title: "Falta el método de pago en Meta",
        detail:
          "Añádelo en el Administrador de WhatsApp. Sin él puedes recibir y responder mensajes, pero no iniciar conversaciones nuevas.",
      };
    case "failed":
      return {
        tone: "warning",
        title: "El alta no terminó bien",
        detail:
          "El canal quedó a medias. Renovar la conexión repite el proceso desde el principio y lo deja completo.",
      };
    default:
      return null;
  }
}

/** "hace 12 minutos". `null` → "Sin datos", nunca una fecha inventada. */
export function readLastCheck(value: string | null | undefined, now: Date = new Date()): string {
  if (value == null) return "Sin datos";
  const minutes = Math.floor((now.getTime() - new Date(value).getTime()) / 60_000);
  if (minutes < 1) return "hace unos segundos";
  if (minutes < 60) return `hace ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.floor(hours / 24);
  return `hace ${days} ${days === 1 ? "día" : "días"}`;
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

/** Qué acciones ofrece el detalle del canal, y por qué. */
export type ChannelActions = {
  can_disconnect: boolean;
  can_reconnect: boolean;
  /**
   * El número quedó dado de alta sin PIN (`awaiting_registration`): el canal
   * recibe pero no puede iniciar conversaciones. Sin una acción propia, la única
   * salida era «Renovar la conexión», que volvía a devolver el mismo sub-estado:
   * un bucle sin ningún sitio donde teclear el PIN.
   */
  can_register_pin: boolean;
  /** Copia de la sección: cambia según quién dejó el canal así. */
  hint: string;
};

const ACTIVE_HINT =
  "Renovar vuelve a pedir tu autorización en Meta; no pierdes historial ni configuración. " +
  "Desconectar detiene el canal sin borrarlo. Al eliminar, este número deja de recibir " +
  "mensajes en Axi y las conversaciones quedan archivadas.";

/**
 * Decide las acciones del detalle (F6).
 *
 * Vive en `domain` y no en el componente porque las reglas son de producto,
 * no de presentación, y son fáciles de romper sin notarlo:
 *
 * - **Desconectar no es eliminar**: es reversible, así que la copia promete
 *   explícitamente que se conserva el historial. Sin esa frase, nadie lo pulsa.
 * - **Quién desconectó cambia el mensaje**: `credentials_revoked` lo escribe
 *   SOLO Meta y `disconnected_at` SOLO el tenant. Sin separarlos, una
 *   revocación y una pausa voluntaria dirían lo mismo, y son cosas muy
 *   distintas para quien lo lee.
 */
export function readChannelActions(channel: ChannelDTO, now: Date = new Date()): ChannelActions {
  const disconnected = channel.status === "disconnected";
  const isCloud = channel.kind === "whatsapp_cloud";
  // Reconectar es relanzar el alta por botón, así que lo tiene todo canal con
  // producto de Meta. Antes era `isCloud`: coherente cuando Instagram y
  // Messenger no tenían alta por botón, pero desde F7 la tienen, y un canal de
  // Instagram revocado solo ofrecía «Eliminar».
  const canReconnect = channelProvider(channel.kind).meta_product !== undefined;
  // Solo WhatsApp Cloud tiene PIN de registro, y solo mientras el canal esté
  // vivo: en uno desconectado primero hay que reconectar
  const canRegisterPin =
    isCloud && !disconnected && channel.onboarding?.status === "awaiting_registration";

  if (!disconnected) {
    return {
      can_disconnect: true,
      can_reconnect: false,
      can_register_pin: canRegisterPin,
      hint: ACTIVE_HINT,
    };
  }

  if (channel.credentials_revoked) {
    return {
      can_disconnect: false,
      can_reconnect: canReconnect,
      can_register_pin: false,
      hint: "Meta revocó el acceso a este canal. Vuelve a conectarlo para seguir recibiendo mensajes.",
    };
  }

  return {
    can_disconnect: false,
    can_reconnect: canReconnect,
    can_register_pin: false,
    hint: disconnectedHint(channel.disconnected_at ?? null, now),
  };
}

function disconnectedHint(disconnectedAt: string | null, now: Date): string {
  if (disconnectedAt === null) {
    return "Este canal está desconectado. Vuelve a conectarlo cuando quieras: conservas el historial.";
  }
  const date = new Date(disconnectedAt);
  const sameYear = date.getFullYear() === now.getFullYear();
  const when = date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  return `Lo desconectaste el ${when}. Conservas el historial y la configuración: vuelve a conectarlo cuando quieras.`;
}
