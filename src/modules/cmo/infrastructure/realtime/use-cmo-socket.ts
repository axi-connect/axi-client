"use client";

import { useEffect, useRef } from "react";

import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { useCmoStore } from "@/modules/cmo/infrastructure/stores/cmo.store";

/**
 * Conexión del despacho de Axel al namespace `/inbox` (los `cmo.*` llegan al
 * room `company_{id}`, automático al conectar). Solo server→client: preguntar,
 * aprobar y rechazar van por REST.
 *
 * **El WS avisa, no sincroniza** — con UNA excepción declarada. Los eventos de
 * tablero (briefing y propuestas) no traen el estado completo: el store recarga
 * del servidor lo que cambió, porque un briefing es un texto largo y una
 * propuesta lleva evidencia y artefactos, y duplicar eso por socket abriría la
 * puerta a que la pantalla y la base discrepen sin que nada lo detecte.
 *
 * Los `cmo.turn_*` SÍ sincronizan, y no hay alternativa: no existe ningún
 * endpoint del que releer un turno a medio escribir. La verdad final sigue
 * siendo el cuerpo del POST; el cierre trae la respuesta ya persistida solo para
 * poder rescatarla cuando esa conexión se cortó.
 *
 * En la RECONEXIÓN se recarga todo: los eventos emitidos mientras el socket
 * estuvo caído se perdieron, y aquí eso significaría un dueño mirando una
 * bandeja con propuestas que ya no existen.
 */
export function useCmoSocket() {
  const { socket, connected } = useSocket("inbox");
  const store = useCmoStore;
  /** true desde la PRIMERA conexión, y no se resetea al caer: es lo que
   *  distingue «reconecté» de «conecté por primera vez». La versión anterior
   *  (`wasConnectedRef = connected` al final del efecto) exigía dos ticks
   *  conectados consecutivos — imposible en un true→false→true — así que la
   *  recarga de reconexión NUNCA disparaba (F19, lo destapó su test). */
  const everConnectedRef = useRef(false);

  useSocketEvent(socket, "cmo.briefing_ready", (payload) => {
    store.getState().onBriefingReady(payload);
  });

  useSocketEvent(socket, "cmo.proposal_created", (payload) => {
    store.getState().onProposalCreated(payload);
  });

  useSocketEvent(socket, "cmo.proposal_decided", (payload) => {
    store.getState().onProposalDecided(payload);
  });

  useSocketEvent(socket, "cmo.turn_started", (payload) => {
    store.getState().onTurnStarted(payload);
  });

  useSocketEvent(socket, "cmo.turn_step", (payload) => {
    store.getState().onTurnStep(payload);
  });

  useSocketEvent(socket, "cmo.turn_delta", (payload) => {
    store.getState().onTurnDelta(payload);
  });

  useSocketEvent(socket, "cmo.turn_completed", (payload) => {
    store.getState().onTurnCompleted(payload);
  });

  useSocketEvent(socket, "cmo.turn_failed", (payload) => {
    store.getState().onTurnFailed(payload);
  });

  useEffect(() => {
    if (connected && everConnectedRef.current) {
      void store.getState().load();
    }
    if (connected) everConnectedRef.current = true;
  }, [connected, store]);
}
