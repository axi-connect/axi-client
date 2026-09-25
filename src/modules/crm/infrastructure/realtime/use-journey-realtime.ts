"use client";

import { useEffect, useRef } from "react";

import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import type { CrmDealRealtimeSummary } from "@/core/realtime/events";
import { emitJourneyChanged } from "@/modules/crm/infrastructure/journey-events";

/** Un movimiento suele traer dos eventos seguidos (el paso y su evento de deal): una recarga. */
export const JOURNEY_REALTIME_DEBOUNCE_MS = 1000;

/**
 * Tiempo real del recorrido de UN contacto (F8 del método comercial). Cuando
 * el servidor avisa `crm.deal_stage_changed` —o `crm.deal_stage_reverted`,
 * que el servidor aún no retransmite por WS— de un deal de ESTE contacto,
 * emite el `crm:journey:changed` de siempre: la card «Recorrido», el
 * historial y la página del 360 ya lo escuchan y se recargan solos. Así no
 * hay un segundo camino de recarga: el WS y el «Deshacer» local avisan igual.
 *
 * Lo monta la página del 360 una vez (si lo montaran la card y el feed, cada
 * uno emitiría y todos recargarían dos veces).
 */
export function useJourneyRealtime(contactId: string): void {
  const { socket } = useSocket("inbox");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onStageEvent = (payload: CrmDealRealtimeSummary) => {
    if (payload.contact_id !== contactId) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      emitJourneyChanged({ contactId, dealId: payload.deal_id });
    }, JOURNEY_REALTIME_DEBOUNCE_MS);
  };

  useSocketEvent(socket, "crm.deal_stage_changed", onStageEvent);
  useSocketEvent(socket, "crm.deal_stage_reverted", onStageEvent);
}
