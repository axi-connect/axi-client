"use client";

import { useReconnect } from "@/core/realtime/use-reconnect";
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

  useSocketEvent(socket, "order.created", (payload) => {
    store.getState().onOrderCreated(payload);
  });

  useSocketEvent(socket, "order.status_changed", (payload) => {
    store.getState().onOrderStatusChanged(payload);
  });

  useSocketEvent(socket, "order.payment_reported", (payload) => {
    store.getState().onOrderPaymentReported(payload);
  });

  useSocketEvent(socket, "order.payment_verified", (payload) => {
    store.getState().onOrderPaymentVerified(payload);
  });

  useSocketEvent(socket, "order.updated", (payload) => {
    store.getState().onOrderUpdated(payload);
  });

  // Reconexión (no primera conexión): recuperar lo perdido
  useReconnect(connected, () => store.getState().fetchBoard());

  return { connected };
}
