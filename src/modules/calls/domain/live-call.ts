import type { CallPhase } from "@/core/realtime/events";

/**
 * El pulso de una llamada en vivo (premium F1/F2): quién habla, en qué fase
 * está el agente y el texto que el agente está diciendo AHORA. TS puro — lo
 * alimentan los eventos de la sala de la llamada y lo consume el aura.
 */

/** Lo que pinta el aura: violeta = agente, coral = cliente, gris = nadie. */
export type AuraMode = "idle" | "listening" | "thinking" | "agent" | "caller";

export type LiveCallPulse = {
  agentSpeaking: boolean;
  callerSpeaking: boolean;
  phase: CallPhase | null;
  /** El relay manda eventos de habla (`CALLS_RELAY_EVENTS`): mandan sobre la fase. */
  hasSpeakerEvents: boolean;
  /** Oraciones del agente enviadas a la voz y aún sin su segmento definitivo. */
  draft: { generation: number; text: string } | null;
  /** Plan de modos: etapa del marco en la que va la llamada proactiva (clave). */
  stage: string | null;
};

export type LiveCallPulseAction =
  | { type: "speaker"; speaker: "agent" | "caller"; state: "on" | "off" }
  | { type: "phase"; phase: CallPhase }
  | { type: "agent_text"; generation: number; text: string }
  /** Llegó un segmento del transcript: el del agente reemplaza el borrador
   * de SU turno (`generation`). Sin generación (servidor anterior), cualquiera. */
  | { type: "segment"; role: "caller" | "agent" | "system"; generation?: number }
  /** La llamada proactiva cambió de etapa (evento `call.stage_changed`). */
  | { type: "stage"; stage: string };

export const INITIAL_LIVE_CALL_PULSE: LiveCallPulse = {
  agentSpeaking: false,
  callerSpeaking: false,
  phase: null,
  hasSpeakerEvents: false,
  draft: null,
  stage: null,
};

export function liveCallPulseReducer(
  state: LiveCallPulse,
  action: LiveCallPulseAction,
): LiveCallPulse {
  switch (action.type) {
    case "speaker": {
      const on = action.state === "on";
      return action.speaker === "agent"
        ? { ...state, hasSpeakerEvents: true, agentSpeaking: on }
        : { ...state, hasSpeakerEvents: true, callerSpeaking: on };
    }
    case "phase": {
      // Al cerrar nadie habla: un «off» perdido no deja el aura encendida.
      const over = action.phase === "ending" || action.phase === "closed";
      return {
        ...state,
        phase: action.phase,
        ...(action.phase === "closed" ? { agentSpeaking: false, callerSpeaking: false } : {}),
        ...(over ? { draft: null } : {}),
      };
    }
    case "agent_text": {
      const text = action.text.trim();
      if (text === "") return state;
      const draft =
        state.draft !== null && state.draft.generation === action.generation
          ? { generation: action.generation, text: `${state.draft.text} ${text}` }
          : { generation: action.generation, text };
      return { ...state, draft };
    }
    case "stage":
      return state.stage === action.stage ? state : { ...state, stage: action.stage };
    case "segment": {
      if (action.role !== "agent" || state.draft === null) return state;
      // Barge-in encadenado: el segmento del turno abortado llega cuando el
      // turno nuevo ya está hablando; no borra lo que el nuevo ya mostró.
      const sameTurn = action.generation === undefined || action.generation === state.draft.generation;
      return sameTurn ? { ...state, draft: null } : state;
    }
  }
}

/**
 * El modo del aura. Con eventos de habla manda quién habla (el cliente gana:
 * si habla encima del agente es un barge-in y el agente ya calló); sin ellos,
 * la fase del agente es la mejor señal disponible.
 */
export function auraModeFor(pulse: LiveCallPulse): AuraMode {
  const { phase } = pulse;
  if (phase === "ending" || phase === "closed") return "idle";
  if (pulse.hasSpeakerEvents) {
    if (pulse.callerSpeaking) return "caller";
    if (pulse.agentSpeaking) return "agent";
    if (phase === "thinking") return "thinking";
    return phase === null ? "idle" : "listening";
  }
  switch (phase) {
    case "greeting":
    case "speaking":
      return "agent";
    case "thinking":
      return "thinking";
    case "listening":
      return "listening";
    default:
      return "idle";
  }
}

/**
 * La etapa en la que va una llamada proactiva: la del evento en vivo si ya
 * llegó alguno; si no, la última de la ruta que trajo el detalle (la vista se
 * abrió con la llamada a mitad). null = reactiva o sin marco.
 */
export function currentStage(pulse: LiveCallPulse, stageRoute: readonly string[]): string | null {
  return pulse.stage ?? stageRoute.at(-1) ?? null;
}

/**
 * Ruta de etapas para pintar: las recorridas (hasta la actual) y las que
 * faltan. Una etapa que la llamada saltó cuenta como recorrida si una
 * posterior ya se alcanzó (el marco es control, no guion).
 */
export type RouteStep = { key: string; label: string; state: "done" | "now" | "next" };

export function routeSteps(
  stages: readonly { key: string; label: string }[],
  current: string | null,
): RouteStep[] {
  const index = current === null ? -1 : stages.findIndex((stage) => stage.key === current);
  return stages.map((stage, i) => ({
    key: stage.key,
    label: stage.label,
    state: index === -1 ? "next" : i < index ? "done" : i === index ? "now" : "next",
  }));
}


/**
 * Dónde van las marcas «Etapa · X» en una transcripción: antes del primer
 * segmento del agente dicho después del cambio de etapa (los eventos
 * `stage_changed` llevan `at_ms` en el mismo reloj que los segmentos). La
 * primera etapa se marca antes del primer segmento del agente. Devuelve
 * `seq → etiqueta`.
 */
export function stageMarks(
  segments: readonly { seq: number; role: string; at_ms: number }[],
  events: readonly { type: string; payload: unknown }[],
  stages: readonly { key: string; label: string }[],
): Map<number, string> {
  const marks = new Map<number, string>();
  if (stages.length === 0) return marks;
  const label = (key: string): string => stages.find((stage) => stage.key === key)?.label ?? key;
  const agent = segments.filter((segment) => segment.role === "agent");
  const first = agent[0];
  const firstStage = stages[0];
  if (first !== undefined && firstStage !== undefined) marks.set(first.seq, firstStage.label);
  for (const event of events) {
    if (event.type !== "stage_changed") continue;
    const payload = (event.payload ?? {}) as { to?: unknown; at_ms?: unknown };
    if (typeof payload.to !== "string" || typeof payload.at_ms !== "number") continue;
    const at = payload.at_ms;
    // El turno que REPORTA la etapa es el que se dijo justo antes del evento.
    const target = [...agent].reverse().find((segment) => segment.at_ms <= at) ?? agent.find((s) => s.at_ms >= at);
    if (target !== undefined) marks.set(target.seq, label(payload.to));
  }
  return marks;
}
