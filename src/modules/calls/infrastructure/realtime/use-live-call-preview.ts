"use client";

import { useEffect, useReducer, useState } from "react";
import type { CallSessionRowDTO, CallTranscriptSegment } from "@/modules/calls/domain/call";
import {
  INITIAL_LIVE_CALL_PULSE,
  auraModeFor,
  liveCallPulseReducer,
  type AuraMode,
  type LiveCallPulse,
} from "@/modules/calls/domain/live-call";
import { getCallSession } from "@/modules/calls/infrastructure/services/calls-service.adapter";
import { useLiveCall } from "./use-live-call";

type Line = { role: CallTranscriptSegment["role"]; text: string };

/**
 * El pulso de UNA llamada en curso para su tarjeta del Monitoreo (premium
 * F5): se une a la sala de la llamada (como el detalle) para saber quién habla
 * y qué se acaba de decir. La última frase de antes de abrir el Monitoreo sale
 * del detalle, una sola vez. Las llamadas a la vez son pocas (el tope del
 * tenant), así que una sala por tarjeta es barato.
 */
export function useLiveCallPreview(call: CallSessionRowDTO): {
  mode: AuraMode;
  pulse: LiveCallPulse;
  line: Line | null;
} {
  const [pulse, dispatch] = useReducer(liveCallPulseReducer, INITIAL_LIVE_CALL_PULSE);
  const [lastLine, setLastLine] = useState<Line | null>(null);

  useEffect(() => {
    let alive = true;
    getCallSession(call.id)
      .then((detail) => {
        if (!alive) return;
        const last = [...detail.segments].reverse().find((segment) => segment.role !== "system");
        if (last !== undefined) setLastLine((current) => current ?? { role: last.role, text: last.text });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [call.id]);

  useLiveCall({
    callSessionId: call.id,
    enabled: true,
    onSpeaker: (event) => dispatch({ type: "speaker", speaker: event.speaker, state: event.state }),
    onPhase: (event) => dispatch({ type: "phase", phase: event.phase }),
    onAgentText: (event) => dispatch({ type: "agent_text", generation: event.generation, text: event.text }),
    onSegment: (segment) => {
      dispatch({ type: "segment", role: segment.role });
      if (segment.role !== "system") setLastLine({ role: segment.role, text: segment.text });
    },
    // El listado del Monitoreo ya re-consulta con los eventos del tenant.
    onChanged: () => undefined,
  });

  const line: Line | null = pulse.draft !== null ? { role: "agent", text: pulse.draft.text } : lastLine;
  const mode = call.status === "in_progress" ? auraModeFor(pulse) : "idle";
  return { mode, pulse, line };
}
