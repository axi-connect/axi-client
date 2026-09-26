"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { BrandLoader } from "@/shared/components/ui/brand-loader";
import {
  isLiveCallStatus,
  SUMMARY_WAIT_MS,
  summaryWaitRemainingMs,
  type CallSessionDetailDTO,
} from "@/modules/calls/domain/call";
import {
  INITIAL_LIVE_CALL_PULSE,
  liveCallPulseReducer,
} from "@/modules/calls/domain/live-call";
import { useLiveCall } from "@/modules/calls/infrastructure/realtime/use-live-call";
import { getCallSession } from "@/modules/calls/infrastructure/services/calls-service.adapter";
import { FinishedCallView } from "@/modules/calls/ui/finished/FinishedCallView";
import { LiveCallView } from "@/modules/calls/ui/live/LiveCallView";

/**
 * Detalle de una llamada: carga el detalle, se suscribe a la sala de la
 * llamada mientras está viva y decide la vista — `LiveCallView` (premium F3)
 * o `FinishedCallView` (premium F4). Cuando termina, `call.ended` recarga y la
 * misma ruta pasa sola de una a la otra.
 */
export function CallDetailView({ callId }: { callId: string }) {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [call, setCall] = useState<CallSessionDetailDTO | null>(null);

  // Solo la carga INICIAL expulsa al historial (la llamada no existe o no es
  // nuestra). Un re-fetch por evento del WS que falle (401 de rotación, 429,
  // red) avisa y conserva la pantalla — antes sacaba al usuario a mitad de
  // una llamada en vivo.
  const load = useCallback(
    (options: { initial: boolean } = { initial: false }) => {
      getCallSession(callId)
        .then(setCall)
        .catch((error: unknown) => {
          showAlert({ tone: "error", title: errorMessage(error) });
          if (options.initial) router.replace("/calls/history");
        });
    },
    [callId, router, showAlert],
  );

  useEffect(() => {
    load({ initial: true });
  }, [load]);

  // Un hueco en la numeración de los segmentos en vivo (el join al room llegó
  // después de que se emitieran) se rellena re-consultando el detalle, con
  // debounce — antes quedaba un agujero permanente en el transcript.
  const gapTimerRef = useRef<number | null>(null);
  const scheduleGapReload = useCallback(() => {
    if (gapTimerRef.current !== null) window.clearTimeout(gapTimerRef.current);
    gapTimerRef.current = window.setTimeout(() => {
      gapTimerRef.current = null;
      load();
    }, 800);
  }, [load]);
  useEffect(
    () => () => {
      if (gapTimerRef.current !== null) window.clearTimeout(gapTimerRef.current);
    },
    [],
  );

  // Transcript en vivo (F4-C): mientras la llamada siga viva, el room
  // `call_…` inserta los segmentos y cualquier cambio de estado re-consulta.
  // Premium F3: el mismo room alimenta el pulso del aura (quién habla, la
  // fase del agente y su texto mientras suena).
  const live = call !== null && isLiveCallStatus(call.status);
  // Recién terminada, el resumen tarda unos segundos: se sigue en la sala
  // hasta que llegue `call.summary_ready` (la isla promete que aparecerá).
  // El tope tiene su propio reloj (auditoría F4, P2): sin él, con la pestaña
  // abierta la vista seguía en la sala para siempre si el resumen no llegaba.
  const [, setSummaryDeadline] = useState(0);
  const awaitingSummary = call !== null && !live && summaryWaitRemainingMs(call, Date.now()) > 0;
  const endedAt = call?.ended_at ?? null;
  useEffect(() => {
    if (!awaitingSummary || endedAt === null) return;
    const remaining = Date.parse(endedAt) + SUMMARY_WAIT_MS - Date.now();
    const timer = window.setTimeout(() => setSummaryDeadline((tick) => tick + 1), Math.max(0, remaining) + 50);
    return () => window.clearTimeout(timer);
  }, [awaitingSummary, endedAt]);
  const [pulse, dispatchPulse] = useReducer(liveCallPulseReducer, INITIAL_LIVE_CALL_PULSE);
  useLiveCall({
    callSessionId: callId,
    enabled: live || awaitingSummary,
    onSpeaker: (event) => dispatchPulse({ type: "speaker", speaker: event.speaker, state: event.state }),
    onPhase: (event) => dispatchPulse({ type: "phase", phase: event.phase }),
    onAgentText: (event) =>
      dispatchPulse({ type: "agent_text", generation: event.generation, text: event.text }),
    onSegment: (segment) => {
      dispatchPulse({ type: "segment", role: segment.role, generation: segment.generation });
      setCall((prev) => {
        if (prev === null) return prev;
        if (prev.segments.some((existing) => existing.seq === segment.seq)) return prev;
        const lastSeq = prev.segments.reduce((max, s) => Math.max(max, s.seq), 0);
        if (segment.seq > lastSeq + 1) scheduleGapReload();
        const next = [
          ...prev.segments,
          {
            seq: segment.seq,
            role: segment.role,
            text: segment.text,
            at_ms: segment.at_ms,
            spoken_at_ms: segment.spoken_at_ms ?? null,
            interrupted: segment.interrupted ?? false,
          },
        ].sort((a, b) => a.seq - b.seq);
        return { ...prev, segments: next };
      });
    },
    onChanged: () => load(),
  });

  if (call === null) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <BrandLoader label="Cargando la llamada" />
      </div>
    );
  }

  if (live) return <LiveCallView call={call} pulse={pulse} />;
  return <FinishedCallView call={call} />;
}
