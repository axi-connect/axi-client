"use client";

import { useEffect, useRef } from "react";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { useLiveCallsStore } from "@/modules/calls/infrastructure/stores/live-calls.store";

/**
 * Conexión del Monitoreo al namespace `/inbox` (los `call.*` llegan al room
 * `company_{id}`, automático al conectar). El WS AVISA, no sincroniza: cada
 * evento agenda un re-fetch de `/calls/sessions/live` (con debounce). En la
 * RECONEXIÓN se re-fetch-ea siempre — lo emitido durante la desconexión se
 * perdió (molde: use-crm-socket).
 */
export function useCallsSocket() {
  const { socket, connected } = useSocket("inbox");
  const store = useLiveCallsStore;
  const wasConnectedRef = useRef(false);

  useSocketEvent(socket, "call.started", () => store.getState().scheduleRefresh());
  useSocketEvent(socket, "call.status_changed", () => store.getState().scheduleRefresh());
  useSocketEvent(socket, "call.ended", () => store.getState().scheduleRefresh());
  // El outcome definitivo llega con el resumen (la card viva ya se fue, pero
  // el KPI del ciclo cambia).
  useSocketEvent(socket, "call.summary_ready", () => store.getState().scheduleRefresh());

  useEffect(() => {
    if (connected && wasConnectedRef.current) {
      void store.getState().fetchLive();
    }
    wasConnectedRef.current = connected;
  }, [connected, store]);

  // Un re-fetch agendado no debe disparar contra una vista ya desmontada.
  useEffect(() => () => store.getState().cancelRefresh(), [store]);

  return { connected };
}
