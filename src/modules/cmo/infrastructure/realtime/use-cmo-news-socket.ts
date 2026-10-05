"use client";

import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { useCmoStore } from "@/modules/cmo/infrastructure/stores/cmo.store";

/**
 * Lo único que la isla global de Axel escucha fuera de /cmo: que llegó el
 * informe y que hay una propuesta nueva. Solo ANOTA la novedad: no recarga el
 * tablero ni el hilo (eso es de `useCmoSocket`, que vive en /cmo). El socket
 * es el compartido del namespace `/inbox`, que la campana ya tiene abierto.
 */
export function useCmoNewsSocket() {
  const { socket } = useSocket("inbox");

  useSocketEvent(socket, "cmo.briefing_ready", (payload) => {
    useCmoStore.getState().noteBriefingReady(payload);
  });

  useSocketEvent(socket, "cmo.proposal_created", (payload) => {
    useCmoStore.getState().noteProposalCreated(payload);
  });
}
