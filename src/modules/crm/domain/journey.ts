/**
 * Recorrido del cliente (F4 del programa «Método comercial»): tipos wire,
 * labels y el resumen de la cadencia de una etapa. Dominio PURO: sin React,
 * sin `http`, sin componentes.
 *
 * El NOMBRE de una etapa es del tenant («Cotización enviada», «Demo»); su KIND
 * es lo que entienden las reglas de avance, el agente y la analítica. Ganado y
 * Perdido NO son kinds: siguen siendo `deal.status` (D7 del CRM, P3 del plan).
 */

import type { StatusMap } from "@/shared/components/features/status-badge";

// TEMPORAL (F4): sustituir por Schemas["..."] al regenerar core/api/schema.d.ts
// (el servidor construye `/crm/journey` y `/crm/contacts/:id/journey` en
// paralelo; estos tipos copian su contrato previsto).

export const STAGE_KINDS = [
  "new",
  "contacted",
  "qualified",
  "meeting",
  "proposal",
  "negotiation",
  "commitment",
  "fulfillment",
  "custom",
] as const;
export type StageKind = (typeof STAGE_KINDS)[number];
export type SemanticStageKind = Exclude<StageKind, "custom">;

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

/** Kinds finales: lo que viene después ya no es vender. */
export function isFinalKind(kind: StageKind): boolean {
  return kind === "commitment" || kind === "fulfillment";
}

export const CADENCE_CHANNELS = ["message", "call", "call_then_message"] as const;
export type CadenceChannel = (typeof CADENCE_CHANNELS)[number];

export const CADENCE_CHANNEL_LABELS: Record<CadenceChannel, string> = {
  message: "Mensaje",
  call: "Llamada",
  call_then_message: "Llamada y luego mensaje",
};

export const EXHAUSTED_ACTIONS = ["mark_lost", "let_cool", "hand_to_human"] as const;
export type ExhaustedAction = (typeof EXHAUSTED_ACTIONS)[number];

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

/* ───────────────────────────── Wire types ───────────────────────────────── */

export interface JourneyCadenceDTO {
  max_attempts: number;
  wait_hours: number;
  channel: CadenceChannel;
  exhausted_action: ExhaustedAction;
}

export interface JourneyStageDTO {
  stage_id: string;
  name: string;
  position: number;
  stage_kind: StageKind;
  /** `null` = la etapa no gobierna el seguimiento. */
  cadence: JourneyCadenceDTO | null;
  /** Tiempo máximo en la etapa, en días («máx. 10 días»). */
  rotting_days: number | null;
  auto_advance: boolean;
  /** Qué la mueve sola, ya en español («cita agendada», «cotización enviada»). */
  moves_on: string[];
}

export interface JourneyTemplateStageDTO {
  name: string;
  stage_kind: StageKind;
  cadence: JourneyCadenceDTO | null;
  rotting_days?: number | null;
}

export interface JourneyTemplateDTO {
  niche_code: string;
  name: string;
  stages: JourneyTemplateStageDTO[];
}

export interface JourneyDTO {
  pipeline_id: string;
  /** Plantilla aplicada por última vez; `null` si el recorrido se armó a mano. */
  template_code: string | null;
  stages: JourneyStageDTO[];
  templates: JourneyTemplateDTO[];
}

export interface PutJourneyStageDTO {
  stage_id: string;
  stage_kind: StageKind;
  cadence: JourneyCadenceDTO | null;
  rotting_days: number | null;
  auto_advance: boolean;
}

export interface PutJourneyDTO {
  stages: PutJourneyStageDTO[];
}

export type JourneyActorType = "user" | "ai_agent" | "system";

export interface ContactJourneyDTO {
  deal: { id: string; title: string; value_cents: number | null; ai_moves_paused: boolean } | null;
  stage: {
    name: string;
    stage_kind: StageKind;
    entered_at: string;
    days_in_stage: number;
    rotting_days: number | null;
  } | null;
  last_move: {
    event_id: string;
    actor_type: JourneyActorType;
    actor_name: string | null;
    reason: string | null;
    rule_code: string | null;
    at: string;
  } | null;
  cadence: {
    attempts_used: number;
    max_attempts: number;
    next_run_at: string | null;
    channel: CadenceChannel;
    enrollment_id: string | null;
  } | null;
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
  first_reply: "primera respuesta",
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
  "ai.turn_completed": "primera respuesta",
  "calls.call_finished": "llamada contestada",
  "scheduling.appointment_booked": "cita agendada",
  "scheduling.appointment_completed": "cita completada",
  "crm.contact_imported": "importado",
};

export function lifecycleSourceLabel(event: string | null | undefined): string | null {
  if (event === null || event === undefined || event === "") return null;
  return LIFECYCLE_SOURCE_LABELS[event] ?? null;
}

/** Evento DOM con el que la ficha, la card y el historial se avisan un cambio. */
export const JOURNEY_CHANGED_EVENT = "crm:journey:changed";

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
 * «4 intentos · cada 2 días · Mensaje · máx. 10 días · luego marcar perdida».
 * Sin cadencia: «Sin cadencia» (+ «· máx. N días» si hay tiempo máximo).
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
      CADENCE_CHANNEL_LABELS[stage.cadence.channel],
    );
  }
  if (stage.rotting_days !== null) {
    parts.push(`máx. ${String(stage.rotting_days)} ${stage.rotting_days === 1 ? "día" : "días"}`);
  }
  if (stage.cadence !== null) {
    parts.push(`luego ${EXHAUSTED_ACTION_LABELS[stage.cadence.exhausted_action].toLowerCase()}`);
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
