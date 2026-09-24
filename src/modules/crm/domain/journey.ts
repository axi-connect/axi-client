/**
 * Recorrido del cliente (F4 del programa «Método comercial»): tipos wire,
 * labels y el resumen de la cadencia de una etapa. Dominio PURO: sin React,
 * sin `http`, sin componentes.
 *
 * El NOMBRE de una etapa es del tenant («Cotización enviada», «Demo»); su KIND
 * es lo que entienden las reglas de avance, el agente y la analítica. Ganado y
 * Perdido NO son kinds: siguen siendo `deal.status` (D7 del CRM, P3 del plan).
 */

import type { Schemas } from "@/core/api/types";
import type { StatusMap } from "@/shared/components/features/status-badge";

/* ───────────────────────────── Wire types ───────────────────────────────── */

/** `switches` (Q8): los dos interruptores del recorrido, solo lectura. */
export type JourneyDTO = Schemas["JourneyDto"];
export type JourneyStageDTO = JourneyDTO["stages"][number];
/** `null` en la etapa = no gobierna el seguimiento. */
export type JourneyCadenceDTO = NonNullable<JourneyStageDTO["cadence"]>;
export type JourneyTemplateDTO = JourneyDTO["templates"][number];
/** El PUT acepta una lista PARCIAL: el editor manda solo la etapa que cambió. */
export type PutJourneyDTO = Schemas["UpdateJourneyDto"];
export type PutJourneyStageDTO = PutJourneyDTO["stages"][number];
/**
 * `last_move` = el último `stage_changed` NO revertido (con `revertible`);
 * `ambiguous` = varias oportunidades abiertas y ninguna que seguir.
 */
export type ContactJourneyDTO = Schemas["ContactJourneyDto"];
export type JourneyActorType = NonNullable<ContactJourneyDTO["last_move"]>["actor_type"];

export type StageKind = JourneyStageDTO["stage_kind"];
export type SemanticStageKind = Exclude<StageKind, "custom">;
export type CadenceChannel = JourneyCadenceDTO["channel"];
export type ExhaustedAction = JourneyCadenceDTO["exhausted_action"];

/**
 * Los `Record<StageKind, …>` de abajo son la verja: un kind nuevo en el
 * contrato rompe el build aquí y obliga a nombrarlo; estas listas son el
 * ORDEN en que se ofrecen, no la fuente del tipo.
 */
export const STAGE_KINDS: readonly StageKind[] = [
  "new",
  "contacted",
  "qualified",
  "meeting",
  "proposal",
  "negotiation",
  "commitment",
  "fulfillment",
  "custom",
];

export const STAGE_KIND_LABELS: Record<StageKind, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  qualified: "Calificado",
  meeting: "Cita",
  proposal: "Propuesta",
  negotiation: "Negociación",
  commitment: "Compromiso",
  fulfillment: "Entrega",
  custom: "Personalizada",
};

/** Una frase por tipo para el selector: qué significa que un contacto esté ahí. */
export const STAGE_KIND_HINTS: Record<StageKind, string> = {
  new: "Acaba de llegar; nadie le ha respondido todavía.",
  contacted: "Ya hubo una primera respuesta o una llamada contestada.",
  qualified: "Sabemos qué quiere y que puede comprarlo.",
  meeting: "Tiene una cita, visita o reunión agendada.",
  proposal: "El cliente ya tiene una cotización en la mano.",
  negotiation: "Hay un pedido creado y falta cerrar el pago.",
  commitment: "Pagó: el compromiso está verificado.",
  fulfillment: "Se está entregando o prestando lo vendido.",
  custom: "No se mueve sola ni entra en las tasas del recorrido.",
};

/**
 * Orden semántico (para explicar y ordenar plantillas). El avance REAL va por
 * `position` dentro del pipeline del tenant; `custom` no tiene lugar aquí.
 */
export const STAGE_KIND_ORDER: readonly SemanticStageKind[] = [
  "new",
  "contacted",
  "qualified",
  "meeting",
  "proposal",
  "negotiation",
  "commitment",
  "fulfillment",
];

export const CADENCE_CHANNELS: readonly CadenceChannel[] = ["message", "call", "call_then_message"];

export const CADENCE_CHANNEL_LABELS: Record<CadenceChannel, string> = {
  message: "Mensaje",
  call: "Llamada",
  call_then_message: "Llamada y luego mensaje",
};

export const EXHAUSTED_ACTIONS: readonly ExhaustedAction[] = ["mark_lost", "let_cool", "hand_to_human"];

export const EXHAUSTED_ACTION_LABELS: Record<ExhaustedAction, string> = {
  mark_lost: "Marcar perdida",
  let_cool: "Dejar enfriar",
  hand_to_human: "Pasar a una persona",
};

/** Opciones del selector «Espera entre intentos», en horas. */
export const CADENCE_WAIT_OPTIONS: readonly number[] = [1, 4, 12, 24, 48, 72, 168];

/** Lo que nace al pulsar «Activar cadencia» en una etapa que no tenía. */
export const DEFAULT_CADENCE: JourneyCadenceDTO = {
  max_attempts: 3,
  wait_hours: 24,
  channel: "message",
  exhausted_action: "let_cool",
};

/**
 * Qué pasa con «Se mueve sola» al cambiar el tipo de una etapa: Personalizada
 * no tiene reglas, así que se apaga; al volver a un tipo con reglas se vuelve
 * a encender (ida y vuelta sin dejar la etapa muda); entre dos tipos con
 * reglas se respeta lo que el negocio había decidido.
 */
export function autoAdvanceAfterKindChange(from: StageKind, to: StageKind, current: boolean): boolean {
  if (to === "custom") return false;
  if (from === "custom") return true;
  return current;
}

/* ───────────────────────────── Interruptores ────────────────────────────── */

/** Qué mueve de verdad las etapas en este negocio (Q8). */
export interface JourneySwitches {
  /** Las reglas por evento (cita agendada, cotización enviada…). */
  rules: boolean;
  /** El agente de IA puede mover etapas por su criterio. */
  ai: boolean;
}

/**
 * Los interruptores del recorrido. Nacen APAGADOS en el servidor, así que
 * sin el campo (un servidor anterior a Q8) se leen apagados: prometer que
 * algo se mueve solo cuando no se mueve es justo el defecto que se corrige.
 */
export function readJourneySwitches(journey: { switches?: JourneyDTO["switches"] } | null | undefined): JourneySwitches {
  const switches = journey?.switches;
  return { rules: switches?.rules_enabled === true, ai: switches?.ai_stage_moves_enabled === true };
}

/**
 * El explicador de arriba del recorrido, según lo que esté encendido. Nunca
 * promete un movimiento que no ocurre: con las reglas apagadas lo dice; con
 * el agente apagado no lo nombra como quien mueve. `emphasis` va en negrita.
 */
export function journeyExplainerText(switches: JourneySwitches): { lead: string; emphasis: string | null; tail: string } {
  const trail = "Todo queda en el historial del contacto y se puede deshacer con un clic.";
  if (switches.rules && switches.ai) {
    return {
      lead: "Cada etapa se mueve sola con sus eventos (una cita agendada, una cotización enviada).",
      emphasis: "El agente también puede moverla por su criterio.",
      tail: trail,
    };
  }
  if (switches.rules) {
    return {
      lead: "Cada etapa se mueve sola con sus eventos (una cita agendada, una cotización enviada).",
      emphasis: null,
      tail: `El agente no mueve etapas en tu negocio. ${trail}`,
    };
  }
  if (switches.ai) {
    return {
      lead: "El avance automático está apagado para tu negocio: las etapas no se mueven solas con sus eventos todavía.",
      emphasis: "El agente sí puede moverlas por su criterio.",
      tail: trail,
    };
  }
  return {
    lead: "El avance automático está apagado para tu negocio: las etapas no se mueven solas todavía.",
    emphasis: null,
    tail: "Por ahora solo una persona las mueve. Lo que definas aquí (tipos y cadencias) queda listo para cuando se encienda.",
  };
}

/** La pista de «Se mueve sola» en la ficha de una etapa, sin prometer lo apagado. */
export function autoAdvanceHint(stage: Pick<JourneyStageDTO, "stage_kind" | "auto_advance">, switches: JourneySwitches): string {
  if (stage.stage_kind === "custom") return "Una etapa personalizada no tiene reglas que la muevan.";
  const who = switches.ai ? "solo una persona o el agente la mueven" : "solo una persona la mueve";
  if (!stage.auto_advance) return `Apagado: ${who}.`;
  if (!switches.rules) return `El avance automático está apagado para tu negocio; hoy ${who}.`;
  return switches.ai ? "Sus eventos la mueven; el agente también puede." : "Sus eventos la mueven.";
}

/* ───────────────────────────── Badges ───────────────────────────────────── */

/** El tipo de la etapa como badge NEUTRO (dot): la etapa no es un semáforo. */
export const STAGE_KIND_BADGES: StatusMap = Object.fromEntries(
  STAGE_KINDS.map((kind) => [kind, { label: STAGE_KIND_LABELS[kind], tone: "neutral" as const }]),
);

/** Avisos del recorrido: lo único que lleva tono es lo que pide atención. */
export const JOURNEY_BADGES: StatusMap = {
  custom: { label: "No se mueve sola", tone: "warning" },
  ai_paused: { label: "Movimientos de la IA en pausa", tone: "warning" },
};

/* ───────────────────────────── Reglas ───────────────────────────────────── */

/**
 * Cómo se cuenta una regla por evento en el historial («regla: cita
 * agendada»). Espejo de `journey_rules.ts` del servidor más `stage_deleted`
 * (P16) y `paid` (P3).
 */
export const JOURNEY_RULE_LABELS: Record<string, string> = {
  first_reply: "primera respuesta del cliente",
  call_answered: "llamada contestada",
  appointment_booked: "cita agendada",
  quoted: "cotización enviada",
  order_created: "pedido creado",
  appointment_completed: "cita completada",
  paid: "pago verificado",
  stage_deleted: "etapa eliminada",
};

export function journeyRuleLabel(code: string | null | undefined): string | null {
  if (code === null || code === undefined || code === "") return null;
  return JOURNEY_RULE_LABELS[code] ?? code.replace(/_/g, " ");
}

/**
 * Qué evento de dominio cambió el ciclo de vida del contacto
 * (`contact_lifecycle_event.source_event`), en español. Un evento sin
 * traducción no se inventa: devuelve null y la línea no lleva paréntesis.
 */
export const LIFECYCLE_SOURCE_LABELS: Record<string, string> = {
  "order.created": "pedido creado",
  "order.quoted": "cotización enviada",
  "order.status_changed": "pago verificado",
  "crm.deal_won": "oportunidad ganada",
  "crm.deal_created": "oportunidad abierta",
  "ai.turn_completed": "primera respuesta del cliente",
  "calls.call_finished": "llamada contestada",
  "scheduling.appointment_booked": "cita agendada",
  "scheduling.appointment_completed": "cita completada",
  "crm.contact_imported": "importado",
};

export function lifecycleSourceLabel(event: string | null | undefined): string | null {
  if (event === null || event === undefined || event === "") return null;
  return LIFECYCLE_SOURCE_LABELS[event] ?? null;
}

/**
 * Movimientos que el servidor NO deshace: el pago verificado fija la etapa
 * junto al `won` (P3) y una etapa borrada ya no tiene a dónde volver (P16).
 */
export const NON_REVERTIBLE_RULES: readonly string[] = ["paid", "stage_deleted"];

/**
 * ¿Ofrecer «Deshacer» sobre este movimiento? Manda el servidor si lo dice
 * (`revertible`); si calla, se decide por la regla que lo movió.
 */
export function isRevertibleMove(move: {
  rule_code?: string | null;
  revertible?: boolean | null;
}): boolean {
  if (move.revertible === false) return false;
  if (move.revertible === true) return true;
  return !(move.rule_code !== null && move.rule_code !== undefined && NON_REVERTIBLE_RULES.includes(move.rule_code));
}

/**
 * Evento DOM con el que la ficha, la card y el historial se avisan un cambio
 * del recorrido de UN contacto (`detail: JourneyChangedDetail`): quien escucha
 * filtra por `contactId` y no recarga la ficha de otro.
 */
export const JOURNEY_CHANGED_EVENT = "crm:journey:changed";
export interface JourneyChangedDetail {
  contactId: string;
  dealId: string | null;
}

/* ───────────────────────────── Formato ──────────────────────────────────── */

/** «cada 4 h» si no llega al día; «cada día» / «cada 2 días» en múltiplos de 24. */
export function waitLabel(hours: number): string {
  if (hours < 24 || hours % 24 !== 0) return `cada ${String(hours)} h`;
  const days = hours / 24;
  return days === 1 ? "cada día" : `cada ${String(days)} días`;
}

/** Etiqueta de una opción del selector de espera («4 h», «1 día», «2 días»). */
export function waitOptionLabel(hours: number): string {
  if (hours < 24 || hours % 24 !== 0) return `${String(hours)} h`;
  const days = hours / 24;
  return days === 1 ? "1 día" : `${String(days)} días`;
}

export function attemptsLabel(count: number): string {
  return count === 1 ? "1 intento" : `${String(count)} intentos`;
}

/**
 * La línea que resume la cadencia de una etapa en la lista del editor:
 * «4 intentos · cada 2 días · mensaje · máx. 10 días · al agotarse: marcar
 * perdida». Sin cadencia: «Sin cadencia» (+ «· máx. N días» si hay máximo).
 */
export function cadenceSummary(
  stage: Pick<JourneyStageDTO, "cadence" | "rotting_days">,
): string {
  const parts: string[] = [];
  if (stage.cadence === null) {
    parts.push("Sin cadencia");
  } else {
    parts.push(
      attemptsLabel(stage.cadence.max_attempts),
      waitLabel(stage.cadence.wait_hours),
      CADENCE_CHANNEL_LABELS[stage.cadence.channel].toLowerCase(),
    );
  }
  if (stage.rotting_days !== null) {
    parts.push(`máx. ${String(stage.rotting_days)} ${stage.rotting_days === 1 ? "día" : "días"}`);
  }
  if (stage.cadence !== null) {
    parts.push(`al agotarse: ${EXHAUSTED_ACTION_LABELS[stage.cadence.exhausted_action].toLowerCase()}`);
  }
  return parts.join(" · ");
}

/** «hoy» · «1 día» · «6 días» — cuánto lleva el contacto en la etapa. */
export function daysInStageLabel(days: number): string {
  if (days <= 0) return "hoy";
  return days === 1 ? "1 día" : `${String(days)} días`;
}

/** Fecha en que se vence el tiempo máximo (entrada + rotting_days), o null. */
export function stageDeadline(enteredAt: string, rottingDays: number | null): Date | null {
  if (rottingDays === null) return null;
  const entered = new Date(enteredAt);
  if (Number.isNaN(entered.getTime())) return null;
  return new Date(entered.getTime() + rottingDays * 86_400_000);
}

/** Quién movió el deal, en la voz de la ficha («el agente Sofía», «una regla»). */
export function moverLabel(move: {
  actor_type: JourneyActorType;
  actor_name: string | null;
}): string {
  if (move.actor_type === "ai_agent") {
    return move.actor_name ? `el agente ${move.actor_name}` : "el agente IA";
  }
  if (move.actor_type === "system") return "una regla";
  return move.actor_name ?? "una persona";
}
