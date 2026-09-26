/**
 * Canal entre pestañas del cambio de identidad por la sesión de soporte.
 *
 * La sesión de soporte TOMA el navegador (dueño, 2026-09-26): mientras dura,
 * cada request del panel de cliente sale con el token de soporte, en TODAS las
 * pestañas (`support-session.ts`). Una pestaña del cliente abierta de antes
 * seguiría mostrando los datos de su tenant mientras sus peticiones ya van a
 * nombre del soporte —y al revés al terminar—, así que al cambiar la identidad
 * las demás pestañas del panel se recargan.
 *
 * Solo el panel de cliente: la consola `/platform` (token en `sessionStorage`)
 * y las pantallas `/auth` no dependen de esas cookies. Cada pestaña ignora sus
 * propios mensajes (`tabId`), porque varias instancias del canal en la misma
 * pestaña sí se los entregan entre sí.
 */

export const AUTH_CHANNEL_NAME = "axi-auth";

export type AuthChannelEvent = "support-started" | "support-ended";

type AuthChannelMessage = { type: AuthChannelEvent; tabId: string };

const tabId =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function openChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  try {
    return new BroadcastChannel(AUTH_CHANNEL_NAME);
  } catch {
    return null;
  }
}

/** Avisa a las demás pestañas. Best-effort: sin BroadcastChannel no pasa nada. */
export function broadcastAuthChange(type: AuthChannelEvent): void {
  const channel = openChannel();
  if (!channel) return;
  channel.postMessage({ type, tabId } satisfies AuthChannelMessage);
  channel.close();
}

/** ¿Esta ruta es del panel de cliente (la que cambia de identidad)? */
export function followsTenantIdentity(pathname: string): boolean {
  return !pathname.startsWith("/platform") && !pathname.startsWith("/auth");
}

/** Escucha los cambios de las OTRAS pestañas. Devuelve la función de limpieza. */
export function onAuthChange(handler: (type: AuthChannelEvent) => void): () => void {
  const channel = openChannel();
  if (!channel) return () => {};
  channel.onmessage = (event: MessageEvent<unknown>) => {
    const data = event.data as Partial<AuthChannelMessage> | null;
    if (!data || data.tabId === tabId) return;
    if (data.type === "support-started" || data.type === "support-ended") handler(data.type);
  };
  return () => channel.close();
}
