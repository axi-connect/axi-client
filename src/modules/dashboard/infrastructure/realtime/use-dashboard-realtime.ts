"use client";

import { useEffect, useRef } from "react";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { useDashboardStore, type DashboardPerms } from "@/modules/dashboard/infrastructure/stores/dashboard.store";

/**
 * Tiempo real del dashboard con re-fetch SELECTIVO y con debounce (una ráfaga
 * de eventos → una sola recarga por sección):
 * - `/inbox`: order.* → ventas + top productos; conversation.* → atención +
 *   flujo; usage.updated → consumo; usage.alert → marca la métrica.
 * - `/channels`: channel.status_changed → actualiza el canal en sitio.
 * Solo se suscribe a lo que el rol puede ver (mismos permisos que el fetch).
 */
export function useDashboardRealtime(perms: DashboardPerms) {
  const { socket: inbox } = useSocket("inbox");
  const { socket: channels } = useSocket("channels");
  const store = useDashboardStore;

  // Debounce por familia: colapsa ráfagas en una recarga.
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of Object.values(pending)) clearTimeout(timer);
    };
  }, []);

  const debounce = (key: string, fn: () => void, ms = 600) => {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(fn, ms);
  };

  const salesEvent = () => {
    if (!perms.orders) return;
    debounce("sales", () => {
      void store.getState().refreshSales();
      void store.getState().refreshTopProducts();
    });
  };
  const conversationsEvent = () => {
    if (!perms.conversations) return;
    debounce("conversations", () => {
      void store.getState().refreshAttention();
      void store.getState().refreshConversations();
    });
  };

  useSocketEvent(inbox, "order.created", salesEvent);
  useSocketEvent(inbox, "order.status_changed", salesEvent);
  useSocketEvent(inbox, "order.payment_reported", salesEvent);
  useSocketEvent(inbox, "conversation.created", conversationsEvent);
  useSocketEvent(inbox, "conversation.status_changed", conversationsEvent);
  useSocketEvent(inbox, "conversation.escalated", conversationsEvent);

  useSocketEvent(inbox, "usage.updated", () => {
    if (!perms.usage) return;
    debounce("usage", () => void store.getState().onUsageUpdated(), 1500);
  });
  useSocketEvent(inbox, "usage.alert", (payload) => {
    if (perms.usage) store.getState().onUsageAlert(payload.metric);
  });

  useSocketEvent(channels, "channel.status_changed", (payload) => {
    if (perms.channels) store.getState().onChannelStatusChanged(payload.channel_id, payload.status);
  });
}
