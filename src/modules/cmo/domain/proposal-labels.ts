import type { BriefingTone, ProposalKind, ProposalStatus } from "./cmo";

/**
 * Vocabulario del módulo — módulo PURO.
 *
 * Traduce los enums del backend a lo que el dueño de un negocio entiende. Dos
 * reglas que no son cosméticas:
 *
 * 1. **Un enum desconocido se muestra CRUDO**, no como "Otro". Es la misma
 *    decisión que tomó marketing con sus estados: si el backend añade un tipo y
 *    el frontend no lo conoce, esconderlo detrás de una etiqueta genérica hace
 *    que el bug tarde semanas en aparecer. Verlo en pantalla lo delata el
 *    primer día.
 * 2. **El tono NO es el acento del módulo.** Verde/ámbar/rojo dicen si algo va
 *    bien o mal; el violeta dice "esto lo produjo la IA". Mezclarlos haría que
 *    un dato bueno pareciera un dato de IA y al revés.
 */

const KIND_LABELS: Record<ProposalKind, string> = {
  campaign: "Campaña",
  recovery: "Recuperación",
  repurchase: "Recompra",
  promotion: "Promoción",
  segment: "Segmento",
  agent_tuning: "Cómo vende tu agente",
  insight: "Hallazgo",
};

export function proposalKindLabel(kind: ProposalKind | string): string {
  return KIND_LABELS[kind as ProposalKind] ?? kind;
}

const STATUS_LABELS: Record<ProposalStatus, string> = {
  pending: "Por decidir",
  approved: "Aprobada",
  rejected: "Descartada",
  // "Venció" y no "Expirada": lo primero es lo que diría una persona.
  expired: "Venció sin decidir",
  superseded: "Reemplazada por una nueva",
};

export function proposalStatusLabel(status: ProposalStatus | string): string {
  return STATUS_LABELS[status as ProposalStatus] ?? status;
}

/**
 * Un `kind` que deja borradores encendibles se aprueba; un `insight` no tiene
 * nada que encender y solo se descarta. La distinción vive aquí y no en la UI
 * porque decide qué botón se pinta, y equivocarla ofrecería al dueño aprobar
 * algo que el backend va a rechazar con `cmo/proposal_nothing_to_apply`.
 */
export function isActionable(kind: ProposalKind | string): boolean {
  return kind !== "insight";
}

/** Clases de tono para los highlights del briefing. Semántico, no de marca. */
export function toneClasses(tone: BriefingTone | string): string {
  switch (tone) {
    case "up":
      return "text-success border-success/35 bg-success/8";
    case "down":
      return "text-warning border-warning/35 bg-warning/8";
    case "warn":
      return "text-destructive border-destructive/35 bg-destructive/8";
    default:
      return "text-muted-foreground border-border";
  }
}

/**
 * Cuánto queda para que una propuesta venza, en palabras.
 *
 * Devuelve `null` cuando no vence: la UI entonces no pinta nada en vez de un
 * "sin fecha" que ocuparía sitio sin decir nada.
 *
 * Reparto de responsabilidades con `isUrgent`: **la palabra dice el día y el
 * color dice la urgencia**. Algo que vence mañana a la 1 de la madrugada está a
 * trece horas, así que la etiqueta dice "mañana" (que es verdad y es como el
 * dueño lo piensa) y el ámbar de `isUrgent` es quien comunica que corre.
 */
export function expiryLabel(expiresAt: string | null, now: Date = new Date()): string | null {
  if (expiresAt === null) return null;
  const target = new Date(expiresAt);
  if (Number.isNaN(target.getTime())) return null;
  if (target.getTime() <= now.getTime()) return "Venció";

  // Días de CALENDARIO, no horas partidas por 24. Es lo que significan las
  // palabras: algo que vence mañana a las 6 de la tarde está a 30 horas, y
  // contar horas lo llamaría "en 2 días" — que es falso y además confunde,
  // porque el dueño ya lo tiene en la cabeza como "mañana".
  const days = calendarDaysBetween(now, target);
  if (days <= 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  return `Vence en ${String(days)} días`;
}

/** Diferencia en días de calendario LOCAL, ignorando la hora del día. */
function calendarDaysBetween(from: Date, to: Date): number {
  const startOfFrom = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const startOfTo = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((startOfTo.getTime() - startOfFrom.getTime()) / 86_400_000);
}

/** true cuando el vencimiento merece el color de alarma, no solo la fecha. */
export function isUrgent(expiresAt: string | null, now: Date = new Date()): boolean {
  if (expiresAt === null) return false;
  const target = new Date(expiresAt);
  if (Number.isNaN(target.getTime())) return false;
  return target.getTime() - now.getTime() <= 48 * 3_600_000;
}

/**
 * De dónde salió una propuesta, para el sello que lleva en el hilo.
 *
 * Importa porque el hilo mezcla dos cosas que llegaron por caminos distintos: lo
 * que Axel dejó por su cuenta (su informe diario o una señal que saltó) y lo que
 * armó porque el dueño se lo pidió en la conversación. Sin el sello, una tarjeta
 * que apareció sola parece respuesta a algo que el dueño nunca preguntó.
 */
export function proposalSourceLabel(source: string): string {
  switch (source) {
    case "briefing":
      return "Del informe del día";
    case "signal":
      return "Lo vi y te avisé";
    case "chat":
      return "De lo que me pediste";
    default:
      return source;
  }
}

/**
 * El día de un briefing, en palabras.
 *
 * `date_local` es el día LOCAL del negocio (`YYYY-MM-DD`), no un instante: se
 * formatea partiendo la cadena y **nunca** con `new Date(cadena)`, porque eso la
 * interpreta como UTC y restaría un día en cualquier zona al oeste de Greenwich
 * — y este módulo es para Colombia.
 */
export function briefingDayLabel(dateLocal: string): string {
  const [year, month, day] = dateLocal.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return dateLocal;
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return dateLocal;
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long" }).format(
    new Date(year, month - 1, day),
  );
}

const ARTIFACT_LABELS: Record<string, string> = {
  campaign: "Campaña",
  automation: "Regla de recuperación",
  promotion: "Promoción",
  template: "Mensaje",
  segment: "Segmento",
  agent_playbook: "Guion de ventas",
};

export function artifactLabel(type: string): string {
  return ARTIFACT_LABELS[type] ?? type;
}

/**
 * Qué queda encendido al aprobar cada tipo de artefacto. Se dice en la tarjeta
 * ANTES de aprobar: es la mitad del contrato con el dueño — sabe exactamente
 * qué va a pasar, y las plantillas y segmentos no "se encienden", son material.
 */
export function artifactAction(type: string): string {
  switch (type) {
    case "campaign":
      return "Se lanza al aprobar";
    case "automation":
    case "promotion":
      return "Se enciende al aprobar";
    case "agent_playbook":
      return "Se aplica al aprobar · reversible";
    default:
      return "Ya está creado, apagado";
  }
}

/**
 * Hora del día en es-CO («4:00 p.m.»). Vive aquí y no en cada componente:
 * estaba duplicada byte a byte en el hero y en los ajustes (F14).
 */
export function formatHour(hour: number): string {
  const suffix = hour < 12 ? "a.m." : "p.m.";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(twelve)}:00 ${suffix}`;
}
