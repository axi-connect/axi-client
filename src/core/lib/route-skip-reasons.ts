/**
 * Por qué NO se pudo escribirle a un contacto por su canal: las razones de la
 * RUTA (`RouteUnavailableReason` del servidor más `unsupported_content`), que
 * comparten los recordatorios de cobro y la entrega de documentos. Un solo
 * mapa para que «no_channel» no salga en crudo en una pantalla y traducido en
 * la otra (QA real de F5). Frases completas; quien las cuelgue tras un «·» las
 * pone en minúscula con `lowerFirst`.
 */
export const ROUTE_SKIP_REASON_LABELS = {
  no_channel: "El contacto no tiene un canal de WhatsApp por el que escribirle",
  channel_not_found: "El canal de WhatsApp ya no existe",
  channel_not_connected: "El canal de WhatsApp está desconectado",
  no_contact_identity: "El contacto no tiene número en ese canal",
  unsupported_channel_kind: "El canal del contacto no admite este envío",
  unsupported_content: "El canal del contacto no permite mandar archivos",
  outside_service_window_no_hsm:
    "Fuera de la ventana de 24 h y sin plantilla aprobada",
} as const;

export type RouteSkipReason = keyof typeof ROUTE_SKIP_REASON_LABELS;

export function isRouteSkipReason(reason: string): reason is RouteSkipReason {
  return reason in ROUTE_SKIP_REASON_LABELS;
}

/** «El canal…» → «el canal…», para colgarla tras «No salió por WhatsApp ·». */
export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
