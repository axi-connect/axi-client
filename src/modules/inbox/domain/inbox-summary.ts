import type { InboxCounts, InboxView } from "./inbox";

/**
 * Frases de la bandeja premium (F1): la cola, el subtítulo vivo de cada vista y
 * las cifras de «Tu día». TypeScript puro: el tiempo relativo («hace 14 min») y
 * la zona del negocio los resuelve la UI y llegan aquí ya formateados, igual que
 * `waitingSince` deja el formateo fuera del dominio (§3.3 regla 1).
 *
 * Voz del progreso (DESIGN §7.1): se cuenta quién espera y qué sigue, nunca un
 * hueco ni un porcentaje negativo.
 */

/** «1 espera» / «3 esperan» / «Nadie espera». */
export function waitingPhrase(queued: number): string {
  if (queued <= 0) return "Nadie espera";
  return queued === 1 ? "1 espera" : `${String(queued)} esperan`;
}

export interface QueueHead {
  /** Nombre visible de la conversación que más lleva en cola. */
  name: string;
  /** Canal por el que escribió. */
  channel: string;
  /** Tiempo relativo ya formateado por la UI («hace 14 min»); `null` sin `queued_at`. */
  since: string | null;
}

export interface QueueNextUp {
  queued: number;
  headline: string;
  /** Frase de la isla: quién sigue, o qué pasa cuando no hay nadie. */
  line: string;
  /** Primer nombre para el botón («Atender a Mariana»); `null` si no hay a quién. */
  firstName: string | null;
}

/**
 * La isla «Lo próximo». La cabeza de la cola sale de `GET /inbox/conversations`
 * con `sort=waiting&page_size=1`, nunca de las filas cargadas: la lista puede
 * estar en otra vista o filtrada.
 */
export function queueNextUp(queued: number, head: QueueHead | null, aiOpen: number): QueueNextUp {
  if (queued <= 0 || head === null) {
    return {
      queued: Math.max(0, queued),
      headline: "Nadie espera",
      line:
        aiOpen > 0
          ? `Axi atiende ${aiOpen === 1 ? "1 conversación" : `${String(aiOpen)} conversaciones`}. Si pasa una al equipo, la verás aquí.`
          : "Axi responde apenas alguien escriba. Si pasa una al equipo, la verás aquí.",
      firstName: null,
    };
  }
  const parts = [head.name, head.channel, head.since].filter((part): part is string => part !== null && part !== "");
  return {
    queued,
    headline: waitingPhrase(queued),
    line: `${queued === 1 ? "Es" : "La que más lleva:"} ${parts.join(" · ")}.`,
    firstName: firstNameOf(head.name),
  };
}

/** Primera palabra de un nombre de persona; un nombre sin espacios se deja entero. */
export function firstNameOf(name: string): string {
  const trimmed = name.trim();
  const first = trimmed.split(/\s+/)[0] ?? trimmed;
  return first === "" ? trimmed : first;
}

/**
 * El subtítulo vivo bajo el título de la vista. `oldestSince` es el tiempo
 * relativo de la cabeza de la cola, ya formateado («hace 14 min»).
 */
export function viewSubtitle(view: InboxView, counts: InboxCounts | null, oldestSince: string | null): string | null {
  if (view === "closed") return "Solo lectura · el historial se consulta, no se continúa";
  if (counts === null) return null;
  const withTeam = Math.max(0, counts.all_open - counts.ai - counts.queued);
  switch (view) {
    case "queued":
      if (counts.queued === 0) return "Nadie espera";
      return oldestSince === null
        ? waitingPhrase(counts.queued)
        : `${waitingPhrase(counts.queued)} · la más antigua ${oldestSince}`;
    case "mine":
      return counts.mine === 0 ? "Ninguna asignada a ti" : `${String(counts.mine)} contigo`;
    case "ai":
      return counts.ai === 0 ? "Axi no atiende ninguna ahora" : `${String(counts.ai)} con Axi · puedes intervenir en cualquiera`;
    case "all_open":
      return counts.all_open === 0
        ? "Ninguna abierta"
        : `${String(counts.all_open)} abiertas · ${String(counts.ai)} con Axi, ${String(withTeam)} con el equipo, ${String(counts.queued)} en cola`;
  }
}

/** Reparto de las abiertas de `counts`: las mismas tres cifras que el subtítulo. */
export function openSplit(counts: InboxCounts): { ai: number; team: number; queued: number } {
  return {
    ai: counts.ai,
    team: Math.max(0, counts.all_open - counts.ai - counts.queued),
    queued: counts.queued,
  };
}

/** Quién resolvió hoy, en cifras enteras a partir de los porcentajes del servidor. */
export function resolvedSplit(resolved: number, aiPct: number): { ai: number; team: number; aiPct: number; teamPct: number } {
  if (resolved <= 0) return { ai: 0, team: 0, aiPct: 0, teamPct: 0 };
  const ai = Math.min(resolved, Math.max(0, Math.round((resolved * aiPct) / 100)));
  const pct = Math.round(Math.min(100, Math.max(0, aiPct)));
  return { ai, team: resolved - ai, aiPct: pct, teamPct: 100 - pct };
}

export type HourSlotState = "past" | "now" | "future";

export interface HourSlot {
  hour: number;
  value: number;
  /** Alto relativo al máximo del día, 0–1. */
  ratio: number;
  state: HourSlotState;
}

/**
 * Las 24 horas del día del negocio a partir de la serie del servidor, que trae
 * solo las horas ya corridas (`hour` = hora local del negocio del bucket, la
 * calcula la UI con `business-time`). Las horas que faltan van vacías y en
 * estado `future`: el día se ve entero, no una barra que crece hacia la derecha.
 */
export function daySlots(points: { hour: number; value: number }[], nowHour: number): HourSlot[] {
  const values = new Array<number>(24).fill(0);
  for (const point of points) {
    if (Number.isInteger(point.hour) && point.hour >= 0 && point.hour < 24) values[point.hour] += Math.max(0, point.value);
  }
  const max = Math.max(0, ...values);
  return values.map((value, hour) => ({
    hour,
    value,
    ratio: max === 0 ? 0 : value / max,
    state: hour < nowHour ? "past" : hour === nowHour ? "now" : "future",
  }));
}
