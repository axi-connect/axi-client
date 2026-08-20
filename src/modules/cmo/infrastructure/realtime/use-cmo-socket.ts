"use client";

import { useEffect, useRef } from "react";

import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { useCmoStore } from "@/modules/cmo/infrastructure/stores/cmo.store";

/**
 * Conexión del despacho de Axel al namespace `/inbox` (los `cmo.*` llegan al
 * room `company_{id}`, automático al conectar). Solo server→client: preguntar,
 * aprobar y rechazar van por REST.
 *
 * **El WS avisa, no sincroniza.** Ningún evento trae el estado completo: el
 * store recarga del servidor lo que cambió. Es deliberado — un briefing es un
 * texto largo y una propuesta lleva evidencia y artefactos; enviarlos por socket
 * duplicaría el contrato y abriría la puerta a que la pantalla y la base
 * discrepen sin que nada lo detecte.
 *
 * En la RECONEXIÓN se recarga todo: los eventos emitidos mientras el socket
 * estuvo caído se perdieron, y aquí eso significaría un dueño mirando una
 * bandeja con propuestas que ya no existen.
 */
export function useCmoSocket() {
  const { socket, connected } = useSocket("inbox");
  const store = useCmoStore;
  const wasConnectedRef = useRef(false);

  useSocketEvent(socket, "cmo.briefing_ready", (payload) => {
    store.getState().onBriefingReady(payload);
  });

  useSocketEvent(socket, "cmo.proposal_created", (payload) => {
    store.getState().onProposalCreated(payload);
  });

  useSocketEvent(socket, "cmo.proposal_decided", (payload) => {
    store.getState().onProposalDecided(payload);
  });

  useEffect(() => {
    if (connected && wasConnectedRef.current) {
      void store.getState().load();
    }
    wasConnectedRef.current = connected;
  }, [connected, store]);
}
