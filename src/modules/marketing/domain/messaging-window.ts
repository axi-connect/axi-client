import type { MessagingWindowDTO } from "./template-catalog";

/**
 * En cuántos días cabe un envío, dado el cupo de 24 h de Meta.
 *
 * **Espeja a `daysToDeliver` del servidor**
 * (`channels/application/ports/messaging_limit.ts`). El despacho ya reparte la
 * campaña sola; esto es solo para poder DECIRLO antes de lanzar, que es la
 * diferencia entre «tarda más de lo que esperaba» y «esto está roto».
 *
 * `null` = sin tope conocido, sale entero. Ojo: `null` NO es cero.
 */
export function daysToDeliver(recipients: number, limit: number | null): number | null {
  if (limit === null || limit <= 0) return null;
  if (recipients <= 0) return 0;
  return Math.ceil(recipients / limit);
}

/**
 * Lo que se le dice al operador, o `null` si no hay nada que avisar: sin tope
 * conocido, o cabe entero en el cupo de hoy.
 */
export function messagingWindowNotice(
  recipients: number,
  window: MessagingWindowDTO | null,
): { days: number; limit: number; remaining: number } | null {
  if (window === null || window.limit === null) return null;
  const limit = window.limit;
  const remaining = window.remaining ?? limit;

  // Con el cupo YA gastado, no el entero. Calcularlo con `limit` decía 4 días
  // donde eran 5, y —lo que más duele— CALLABA cuando quedaba poco cupo: 250
  // destinatarios con 50 libres daban «1 día» y ningún aviso, cuando de verdad
  // tardaba dos. Y el cupo medio gastado es el caso normal a media jornada.
  const today = Math.min(recipients, Math.max(0, remaining));
  const days = today === recipients ? 1 : 1 + Math.ceil((recipients - today) / limit);

  if (recipients <= 0 || days <= 1) return null;
  return { days, limit, remaining };
}
