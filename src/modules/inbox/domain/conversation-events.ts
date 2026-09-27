import type { ConversationEvent } from "./inbox";

/**
 * Los eventos de handoff como frases del hilo (Inbox premium F2). TypeScript
 * puro sobre `GET /inbox/conversations/:id/events`: la hora y la zona las pone
 * la UI.
 *
 * Todo sale del payload real del servidor:
 * - `escalated`: `{ reason }`, con los motivos de `agent_runtime` y
 *   `ingest_echo_message`.
 * - `taken_over`: `{ via: 'business_app' }` cuando respondieron desde el celular.
 * - `returned_to_ai`: `{ has_note }` más un `note_added` con `{ note, for_ai_history }`.
 * - `closed`: `{ status, reason? }`.
 * - `sla_breached`: `{ sla_seconds }`.
 *
 * `intent_detected` no se pinta: es ruido para quien atiende.
 */

export type EventTone = "ai" | "self" | "team" | "warning" | "done";

export interface EventLine {
  id: string;
  at: string;
  tone: EventTone;
  text: string;
  /** Nota que el equipo dejó para Axi al devolverle la conversación. */
  note?: string;
}

/** Por qué Axi pasó la conversación, como final de frase («…: el cliente pidió…»). */
const REASON_CLAUSE: Record<string, string> = {
  contact_requested_human: "el cliente pidió hablar con una persona",
  tool: "decidió que esta la atienda una persona",
  usage_limit: "llegó al límite de uso del plan",
  ai_failures: "no pudo responder varias veces seguidas",
  unproductive_tools: "no encontró cómo resolverlo",
  no_ai_runtime: "no hay un agente de IA activo en este canal",
  ai_runtime: "no pudo seguir atendiendo",
};

/** El mismo motivo como frase completa, para la isla «Por qué está aquí». */
const REASON_SENTENCE: Record<string, string> = {
  contact_requested_human: "El cliente pidió hablar con una persona.",
  tool: "Axi decidió que esta la atienda una persona.",
  usage_limit: "Axi llegó al límite de uso del plan.",
  ai_failures: "Axi no pudo responder varias veces seguidas.",
  unproductive_tools: "Axi no encontró cómo resolverlo.",
  no_ai_runtime: "No hay un agente de IA activo en este canal.",
  ai_runtime: "Axi no pudo seguir atendiendo.",
};

const GENERIC_SENTENCE = "Axi pasó la conversación al equipo.";

function payloadOf(event: ConversationEvent): Record<string, unknown> {
  return typeof event.payload === "object" && event.payload !== null ? (event.payload as Record<string, unknown>) : {};
}

function stringField(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export function escalationSentence(reason: string | null): string {
  return reason !== null && reason in REASON_SENTENCE ? REASON_SENTENCE[reason] : GENERIC_SENTENCE;
}

/** Quién hizo algo: «tú», un nombre conocido o «el equipo» (no se inventan nombres). */
function actorName(event: ConversationEvent, meId: string | null, names: Record<string, string>): { self: boolean; name: string } {
  if (event.actor_user_id !== null && event.actor_user_id === meId) return { self: true, name: "tú" };
  const known = event.actor_user_id !== null ? names[event.actor_user_id] : undefined;
  return { self: false, name: known ?? "el equipo" };
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Una línea del hilo, o `null` si el evento no se pinta. */
export function describeConversationEvent(
  event: ConversationEvent,
  meId: string | null = null,
  names: Record<string, string> = {},
): EventLine | null {
  const payload = payloadOf(event);
  const base = { id: event.id, at: event.created_at };
  switch (event.type) {
    case "escalated": {
      const reason = stringField(payload, "reason");
      const clause = reason !== null ? REASON_CLAUSE[reason] : undefined;
      return {
        ...base,
        tone: "ai",
        text: clause === undefined ? "Axi pasó la conversación al equipo" : `Axi pasó la conversación al equipo: ${clause}`,
      };
    }
    case "claimed": {
      const who = actorName(event, meId, names);
      return { ...base, tone: who.self ? "self" : "team", text: who.self ? "Atendiste la conversación" : `${capitalize(who.name)} atendió la conversación` };
    }
    case "taken_over": {
      if (stringField(payload, "via") === "business_app") {
        return { ...base, tone: "team", text: "Respondieron desde el celular del negocio: Axi quedó en pausa" };
      }
      const who = actorName(event, meId, names);
      return { ...base, tone: who.self ? "self" : "team", text: who.self ? "Interviniste: Axi quedó en pausa" : `${capitalize(who.name)} intervino: Axi quedó en pausa` };
    }
    case "returned_to_ai": {
      const who = actorName(event, meId, names);
      return { ...base, tone: who.self ? "self" : "team", text: who.self ? "Devolviste la conversación a Axi" : `${capitalize(who.name)} devolvió la conversación a Axi` };
    }
    case "closed": {
      const resolved = stringField(payload, "status") !== "closed";
      const verb = resolved ? "resolvió" : "cerró";
      if (event.actor_type === "ai_agent" || event.actor_type === "system") {
        return { ...base, tone: "done", text: `Axi ${verb} la conversación` };
      }
      const who = actorName(event, meId, names);
      const reason = stringField(payload, "reason");
      const text = who.self ? `${resolved ? "Resolviste" : "Cerraste"} la conversación` : `${capitalize(who.name)} ${verb} la conversación`;
      return { ...base, tone: "done", text: reason === null ? text : `${text}: ${reason}` };
    }
    case "reopened":
      return { ...base, tone: "team", text: "Se reabrió la conversación" };
    case "sla_breached": {
      const seconds = typeof payload.sla_seconds === "number" ? payload.sla_seconds : null;
      const minutes = seconds === null ? null : Math.max(1, Math.round(seconds / 60));
      return { ...base, tone: "warning", text: minutes === null ? "Superó el tiempo de espera en cola" : `Superó los ${String(minutes)} min de espera en cola` };
    }
    case "priority_changed":
      return { ...base, tone: "warning", text: "Cambió la prioridad de la conversación" };
    case "note_added": {
      const note = stringField(payload, "note");
      return note === null ? null : { ...base, tone: "team", text: "Nota del equipo", note };
    }
    case "intent_detected":
      return null;
  }
}

/** Ventana en la que un `note_added` se considera la nota de la devolución que lo precede. */
const NOTE_PAIRING_MS = 5_000;

/**
 * Las líneas del hilo, en orden cronológico ascendente (el servidor las da
 * descendentes). La nota de una devolución (`note_added` con `for_ai_history`)
 * se cuelga de su `returned_to_ai` en vez de ir como línea aparte.
 */
export function buildEventLines(events: readonly ConversationEvent[], meId: string | null = null, names: Record<string, string> = {}): EventLine[] {
  const sorted = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const lines: EventLine[] = [];
  let lastReturn: EventLine | null = null;
  for (const event of sorted) {
    const line = describeConversationEvent(event, meId, names);
    if (line === null) continue;
    if (event.type === "note_added" && payloadOf(event).for_ai_history === true) {
      const paired =
        lastReturn !== null &&
        lastReturn.note === undefined &&
        Math.abs(Date.parse(line.at) - Date.parse(lastReturn.at)) <= NOTE_PAIRING_MS;
      if (paired && lastReturn !== null) lastReturn.note = line.note;
      else lines.push({ ...line, text: "Nota para Axi" });
      continue;
    }
    lines.push(line);
    if (event.type === "returned_to_ai") lastReturn = line;
  }
  return lines;
}

export interface HandoffReason {
  sentence: string;
  /** ISO del escalamiento. */
  at: string;
  /** El SLA que venció después, si venció: minutos. */
  slaMinutes: number | null;
}

/**
 * El motivo del último escalamiento del episodio actual. Si después hubo una
 * devolución a Axi, ese escalamiento ya no explica nada y no hay motivo.
 */
export function handoffReason(events: readonly ConversationEvent[]): HandoffReason | null {
  const sorted = [...events].sort((a, b) => b.created_at.localeCompare(a.created_at));
  let sla: number | null = null;
  for (const event of sorted) {
    if (event.type === "returned_to_ai") return null;
    if (event.type === "sla_breached" && sla === null) {
      const seconds = payloadOf(event).sla_seconds;
      sla = typeof seconds === "number" ? Math.max(1, Math.round(seconds / 60)) : null;
    }
    if (event.type === "escalated") {
      return { sentence: escalationSentence(stringField(payloadOf(event), "reason")), at: event.created_at, slaMinutes: sla };
    }
  }
  return null;
}

/** Quién cerró: «por Axi», «por ti» o «por el equipo»; `null` si no hay evento de cierre. */
export function closedBy(events: readonly ConversationEvent[], meId: string | null = null, names: Record<string, string> = {}): string | null {
  const closed = [...events].sort((a, b) => b.created_at.localeCompare(a.created_at)).find((event) => event.type === "closed");
  if (closed === undefined) return null;
  if (closed.actor_type === "ai_agent" || closed.actor_type === "system") return "por Axi";
  const who = actorName(closed, meId, names);
  return who.self ? "por ti" : `por ${who.name}`;
}
