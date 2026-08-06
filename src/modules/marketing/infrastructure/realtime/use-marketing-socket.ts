"use client";

import { useEffect, useRef } from "react";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { useOverviewStore } from "@/modules/marketing/infrastructure/stores/overview.store";

/**
 * Conexión del resumen de marketing al namespace `/inbox` (los `marketing.*`
 * llegan al room `company_{id}`, automático al conectar). Solo server→client:
 * lanzar, pausar o encender van por REST.
 *
 * Cada evento se mapea a una mutación concreta del store — nunca a una
 * invalidación global. Solo `campaign_progress` provoca un refetch, y dirigido
 * a SU campaña.
 *
 * En la RECONEXIÓN se recarga: los eventos emitidos mientras el socket estuvo
 * caído se perdieron y las cifras habrían quedado desfasadas en silencio.
 */
export function useMarketingSocket() {
  const { socket, connected } = useSocket("inbox");
  const store = useOverviewStore;
  const wasConnectedRef = useRef(false);

  useSocketEvent(socket, "marketing.campaign_status_changed", (payload) => {
    store.getState().onCampaignStatusChanged(payload);
  });

  useSocketEvent(socket, "marketing.campaign_progress", (payload) => {
    store.getState().onCampaignProgress(payload);
  });

  useSocketEvent(socket, "marketing.automation_triggered", (payload) => {
    store.getState().onAutomationTriggered(payload, new Date().toISOString());
  });

  useSocketEvent(socket, "marketing.opt_out_created", (payload) => {
    store.getState().onOptOutCreated(payload);
  });

  useEffect(() => {
    if (connected && wasConnectedRef.current) {
      void store.getState().load();
    }
    wasConnectedRef.current = connected;
  }, [connected, store]);

  return { connected };
}
