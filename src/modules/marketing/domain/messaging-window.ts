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
  const days = daysToDeliver(recipients, window.limit);
  if (days === null || days <= 1) return null;
  return { days, limit: window.limit, remaining: window.remaining ?? window.limit };
}
