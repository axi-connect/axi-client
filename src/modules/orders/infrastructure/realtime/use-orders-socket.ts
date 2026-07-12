"use client";

import { useEffect, useRef } from "react";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { useOrdersStore } from "@/modules/orders/infrastructure/stores/orders.store";

/**
 * Conexión del panel de pedidos al namespace `/inbox` (los eventos `order.*`
 * llegan al room `company_{id}`, automático al conectar — sin join extra).
 * Solo eventos server→client: las acciones de pedidos son REST.
 *
 * En el flanco de RECONEXIÓN se re-fetch-ea el tablero completo: los eventos
 * emitidos durante la desconexión se perdieron.
 */
export function useOrdersSocket() {
  const { socket, connected } = useSocket("inbox");
  const store = useOrdersStore;
  const wasConnectedRef = useRef(false);

  useSocketEvent(socket, "order.created", (payload) => {
    store.getState().onOrderCreated(payload);
  });

  useSocketEvent(socket, "order.status_changed", (payload) => {
    store.getState().onOrderStatusChanged(payload);
  });

  useSocketEvent(socket, "order.payment_reported", (payload) => {
    store.getState().onOrderPaymentReported(payload);
  });

  useSocketEvent(socket, "order.updated", (payload) => {
    store.getState().onOrderUpdated(payload);
  });

  useEffect(() => {
    if (connected && wasConnectedRef.current) {
      // Reconexión (no primera conexión): recuperar lo perdido
      void store.getState().fetchBoard();
    }
    wasConnectedRef.current = connected;
  }, [connected, store]);

  return { connected };
}
