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
};

export type LiveCallPulseAction =
  | { type: "speaker"; speaker: "agent" | "caller"; state: "on" | "off" }
  | { type: "phase"; phase: CallPhase }
  | { type: "agent_text"; generation: number; text: string }
  /** Llegó un segmento del transcript: el del agente reemplaza el borrador
   * de SU turno (`generation`). Sin generación (servidor anterior), cualquiera. */
  | { type: "segment"; role: "caller" | "agent" | "system"; generation?: number };

export const INITIAL_LIVE_CALL_PULSE: LiveCallPulse = {
  agentSpeaking: false,
  callerSpeaking: false,
  phase: null,
  hasSpeakerEvents: false,
  draft: null,
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
