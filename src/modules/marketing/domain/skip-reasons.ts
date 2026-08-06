/**
 * Por qué un contacto NO recibió el mensaje, en el idioma del operador.
 *
 * El conjunto real es la unión de tres fuentes del backend, verificada contra
 * el código (no contra la KB, que lista algunas que no existen):
 *   - `RouteUnavailableReason` de conversations (no hay canal por el que salir)
 *   - `NotifySkipReason` del notificador (suspensión, cupo, contenido)
 *   - los propios del dispatch de marketing (baja, cancelación, anti-ban)
 *
 * REGLA: un motivo desconocido NO se traduce ni se esconde — se muestra crudo.
 * Si el backend añade uno nuevo, tiene que verse raro para que lo mapeemos,
 * no verse bien por accidente (mismo criterio que `StatusBadge`).
 */

export const SKIP_REASON_LABELS: Record<string, string> = {
  // --- El contacto no quiere o no se le puede escribir ---
  opted_out: "El contacto pidió no recibir promociones",
  no_channel: "El contacto no tiene ningún canal alcanzable",
  channel_not_found: "El canal ya no existe",
  channel_not_connected: "El canal está desconectado",
  unsupported_channel_kind: "Instagram y Messenger todavía no envían campañas",
  no_contact_identity: "El contacto no tiene identidad en ese canal",
  contact_not_found: "El contacto ya no existe",
  conversation_not_found: "La conversación ya no existe",

  // --- Ventana de 24 h de WhatsApp ---
  outside_service_window: "Pasaron más de 24 h y no había plantilla de Meta",
  outside_service_window_no_hsm: "Pasaron más de 24 h y la regla no tiene plantilla de Meta",
  template_not_approved: "La plantilla de Meta fue pausada o rechazada",
  unsupported_content: "Ese contenido no viaja por ese canal",

  // --- Límites de la cuenta ---
  company_suspended: "Cuenta suspendida: no salen mensajes",
  limit_exceeded: "Se agotó el cupo de mensajes del plan",
  wweb_throttle_exhausted: "El canal de WhatsApp Web no tuvo cupo (límite anti-bloqueo)",

  // --- Decisiones del propio módulo ---
  campaign_cancelled: "La campaña fue cancelada",
  invalid_content: "El contenido no es válido (contacta a soporte)",
  in_flight: "Ya había un envío en curso para este destinatario",
  human_active: "Un asesor estaba atendiendo la conversación",
  promotion_inactive: "La promoción de la regla estaba apagada o vencida",

  // --- Anti-spam que NO es un fallo (ver TRANSIENT_SKIP_REASONS) ---
  cooldown: "Se le escribió hace muy poco",
  daily_cap_reached: "Ya recibió su mensaje de hoy",
};

/**
 * Motivos que NO son un descarte definitivo: liberan el episodio y el contacto
 * puede recibir el mensaje más adelante. No deben contarse como "perdidos" ni
 * ocupar sitio en el desglose de una campaña — son el anti-spam funcionando.
 */
export const TRANSIENT_SKIP_REASONS: ReadonlySet<string> = new Set([
  "cooldown",
  "daily_cap_reached",
]);

export function skipReasonLabel(reason: string | null | undefined): string {
  if (!reason) return "Sin motivo registrado";
  return SKIP_REASON_LABELS[reason] ?? reason;
}

export function isTransientSkipReason(reason: string | null | undefined): boolean {
  return reason !== null && reason !== undefined && TRANSIENT_SKIP_REASONS.has(reason);
}

/**
 * Desglose ordenado de mayor a menor para el panel. Los motivos transitorios se
 * excluyen: mezclarlos con los definitivos infla el "no recibieron" con casos
 * que sí van a recibirlo.
 */
export function skipReasonBreakdown(
  byReason: Record<string, number> | undefined,
): Array<{ reason: string; label: string; count: number }> {
  if (!byReason) return [];
  return Object.entries(byReason)
    .filter(([reason, count]) => count > 0 && !isTransientSkipReason(reason))
    .map(([reason, count]) => ({ reason, label: skipReasonLabel(reason), count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
}
