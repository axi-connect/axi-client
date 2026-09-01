"use client";

import { useEffect, useRef } from "react";
import type { CallTranscriptSegmentEvent } from "@/core/realtime/events";
import { socketManager } from "@/core/realtime/socket-manager";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";

/**
 * Suscripción al room de UNA llamada (`inbox.join_call`) para el transcript
 * en vivo del detalle. Reglas heredadas de LeadDetailView (prospecting):
 *
 * - El effect depende SOLO de `socket`, jamás de `connected` — con la
 *   dependencia ingenua, la rotación del token (~14 min) dejaba el socket
 *   fuera del room para siempre.
 * - El join se da por hecho SOLO tras el ack; `onDisconnect` olvida la
 *   membresía (muere con la conexión) y `onConnect` re-une Y recarga: lo
 *   emitido durante la desconexión no llegó a nadie.
 * - `leave` en el cleanup es best-effort.
 *
 * `enabled=false` (llamada ya terminada) no abre nada.
 */
export function useLiveCall({
  callSessionId,
  enabled,
  onSegment,
  onChanged,
}: {
  callSessionId: string;
  enabled: boolean;
  /** Un segmento nuevo del transcript (ya filtrado por sesión). */
  onSegment: (segment: CallTranscriptSegmentEvent) => void;
  /** Estado/resumen cambiaron o hubo reconexión: re-consultar el detalle. */
  onChanged: () => void;
}) {
  const { socket } = useSocket("inbox");
  const joinedRef = useRef<string | null>(null);

  // Los handlers viven en refs: useSocketEvent ya los fija por ref, pero los
  // callbacks de quien llama cambian por render y no deben re-suscribir.
  const onSegmentRef = useRef(onSegment);
  const onChangedRef = useRef(onChanged);
  onSegmentRef.current = onSegment;
  onChangedRef.current = onChanged;

  useSocketEvent(socket, "call.transcript_segment", (payload) => {
    if (payload.call_session_id === callSessionId) onSegmentRef.current(payload);
  });
  useSocketEvent(socket, "call.status_changed", (payload) => {
    if (payload.call_session_id === callSessionId) onChangedRef.current();
  });
  useSocketEvent(socket, "call.ended", (payload) => {
    if (payload.call_session_id === callSessionId) onChangedRef.current();
  });
  useSocketEvent(socket, "call.summary_ready", (payload) => {
    if (payload.call_session_id === callSessionId) onChangedRef.current();
  });

  useEffect(() => {
    if (socket === null || !enabled) return;

    const join = () => {
      socketManager
        .emitWithAck(socket, "inbox.join_call", { call_session_id: callSessionId })
        .then((ack) => {
          if (ack.ok) joinedRef.current = callSessionId;
        })
        .catch(() => {
          // Timeout: joinedRef queda sin fijar y el próximo connect reintenta.
        });
    };

    join();
    const onConnect = () => {
      join();
      onChangedRef.current();
    };
    const onDisconnect = () => {
      joinedRef.current = null;
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      if (joinedRef.current !== null) {
        const leaving = joinedRef.current;
        joinedRef.current = null;
        socketManager
          .emitWithAck(socket, "inbox.leave_call", { call_session_id: leaving })
          .catch(() => {
            // Salir es best-effort: si el socket ya murió, el room murió con él.
          });
      }
    };
  }, [socket, callSessionId, enabled]);
}
