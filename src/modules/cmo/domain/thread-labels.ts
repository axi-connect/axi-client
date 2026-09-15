import type { CmoThreadDTO } from "./cmo";

/**
 * Etiquetas de las conversaciones con Axel. TypeScript puro: se prueba con
 * fechas construidas en local, igual que `expiryLabel`.
 */

const LOCALE = "es-CO";

const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short" });
const hourMinute = new Intl.DateTimeFormat(LOCALE, { hour: "numeric", minute: "2-digit" });

/** «15 sept», sin el «de» ni el punto que el motor añade a la abreviatura. */
function shortDate(date: Date): string {
  return dayMonth.format(date).replace(" de ", " ").replace(".", "");
}

/** El título que puso el servidor o, si aún no hay, la fecha de la conversación. */
export function threadTitle(thread: CmoThreadDTO): string {
  if (thread.title !== null && thread.title.trim() !== "") return thread.title;
  return `Conversación del ${shortDate(new Date(thread.created_at))}`;
}

function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Hora si fue hoy («10:42 a. m.»), fecha corta si no («15 sep»). */
export function threadWhen(thread: CmoThreadDTO, now: Date = new Date()): string {
  const at = new Date(thread.last_message_at);
  return sameLocalDay(at, now) ? hourMinute.format(at) : shortDate(at);
}

export interface ThreadGroups {
  today: CmoThreadDTO[];
  yesterday: CmoThreadDTO[];
  earlier: CmoThreadDTO[];
}

/**
 * Hoy / Ayer / Antes por día de calendario LOCAL, cada grupo del más reciente al
 * más antiguo. Un hilo de las 23:50 de ayer es de ayer aunque hayan pasado diez
 * minutos: la agrupación es por fecha, no por antigüedad.
 */
export function groupThreadsByDay(threads: readonly CmoThreadDTO[], now: Date = new Date()): ThreadGroups {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const sorted = [...threads].sort(
    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
  );
  const groups: ThreadGroups = { today: [], yesterday: [], earlier: [] };
  for (const thread of sorted) {
    const at = new Date(thread.last_message_at);
    if (sameLocalDay(at, now)) groups.today.push(thread);
    else if (sameLocalDay(at, yesterday)) groups.yesterday.push(thread);
    else groups.earlier.push(thread);
  }
  return groups;
}
