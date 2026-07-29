"use client";

import { useEffect, useRef } from "react";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { useBoardStore } from "@/modules/crm/infrastructure/stores/board.store";

/**
 * Conexión del pipeline al namespace `/inbox` (los `crm.deal_*` llegan al
 * room `company_{id}`, automático al conectar). Solo server→client: las
 * acciones de deals son REST. En la RECONEXIÓN se re-fetch-ea el board
 * completo (los eventos emitidos durante la desconexión se perdieron).
 */
export function useCrmSocket() {
  const { socket, connected } = useSocket("inbox");
  const store = useBoardStore;
  const wasConnectedRef = useRef(false);

  useSocketEvent(socket, "crm.deal_created", (payload) => {
    store.getState().onDealCreated(payload);
  });

  useSocketEvent(socket, "crm.deal_updated", (payload) => {
    store.getState().onDealUpdated(payload);
  });

  useSocketEvent(socket, "crm.deal_stage_changed", (payload) => {
    store.getState().onDealStageChanged(payload);
  });

  useSocketEvent(socket, "crm.deal_won", (payload) => {
    store.getState().onDealWon(payload);
  });

  useSocketEvent(socket, "crm.deal_lost", (payload) => {
    store.getState().onDealLost(payload);
  });

  useSocketEvent(socket, "crm.deal_stalled", (payload) => {
    store.getState().onDealStalled(payload);
  });

  useEffect(() => {
    if (connected && wasConnectedRef.current) {
      void store.getState().fetchBoard();
      void store.getState().fetchStats();
    }
    wasConnectedRef.current = connected;
  }, [connected, store]);

  return { connected };
}
