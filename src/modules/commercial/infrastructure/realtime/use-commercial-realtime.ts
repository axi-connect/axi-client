"use client";

import { useEffect, useRef } from "react";

import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { useCommercialStore } from "@/modules/commercial/infrastructure/stores/commercial.store";

/** Una ráfaga de eventos (el rollup emite `pace_updated` y `pace_behind` juntos) → una recarga. */
export const COMMERCIAL_REALTIME_DEBOUNCE_MS = 1000;

/**
 * Tiempo real del método comercial (F8, namespace `/inbox`, room company).
 * El WS AVISA y el store re-consulta REST con debounce de ~1 s; cada sección
 * conserva su número de secuencia, así que una recarga que llega tarde nunca
 * pisa a una más nueva:
 *
 * - `commercial.goal_set` → meta, plan y ritmo (`refresh`: si había una carga
 *   en vuelo, espera y vuelve a pedir, porque pudo salir antes del cambio).
 * - `commercial.plan_recomputed` · `pace_updated` · `pace_behind` ·
 *   `pace_recovered` → plan y ritmo (`reloadPace`; sin meta no pide nada).
 * - Con `proposals`: `cmo.proposal_created` / `cmo.proposal_decided` y
 *   `pace_behind` → «Axi propone» (la propuesta la persiste cmo y llega por su
 *   evento; la decidió quizá otra pestaña u otra persona).
 * - Al RECONECTAR se recarga todo: lo emitido con el socket caído se perdió.
 *
 * Lo montan `/comercial` (con propuestas) y la franja del Panel
 * (`GoalProgressBlock`, sin ellas). Sin `enabled` (permiso o capacidad) no
 * hace nada.
 */
export function useCommercialRealtime({ enabled, proposals = false }: { enabled: boolean; proposals?: boolean }): void {
  const { socket, connected } = useSocket("inbox");
  const store = useCommercialStore;
  const everConnected = useRef(false);

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of Object.values(pending)) clearTimeout(timer);
    };
  }, []);

  const debounce = (key: string, fn: () => void) => {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(fn, COMMERCIAL_REALTIME_DEBOUNCE_MS);
  };

  const reloadRoute = () => {
    if (!enabled) return;
    debounce("route", () => void store.getState().refresh());
  };
  const reloadPace = () => {
    if (!enabled) return;
    debounce("pace", () => void store.getState().reloadPace());
  };
  const reloadProposals = () => {
    if (!enabled || !proposals) return;
    // Sin meta la lista no se pinta (ni se pidió): no hay nada que refrescar.
    if (store.getState().goal.data?.goal == null) return;
    debounce("proposals", () => void store.getState().loadProposals());
  };

  useSocketEvent(socket, "commercial.goal_set", reloadRoute);
  useSocketEvent(socket, "commercial.plan_recomputed", reloadPace);
  useSocketEvent(socket, "commercial.pace_updated", reloadPace);
  useSocketEvent(socket, "commercial.pace_behind", () => {
    reloadPace();
    reloadProposals();
  });
  useSocketEvent(socket, "commercial.pace_recovered", reloadPace);
  useSocketEvent(socket, "cmo.proposal_created", reloadProposals);
  useSocketEvent(socket, "cmo.proposal_decided", reloadProposals);

  // Reconexión = volver a `connected` después de haberlo estado alguna vez (la
  // primera conexión no: el montaje ya cargó). `enabled`/`proposals` se leen
  // por ref para que cambiar de permiso no dispare una recarga falsa.
  const latest = useRef({ enabled, proposals });
  latest.current = { enabled, proposals };
  useEffect(() => {
    if (!connected) return;
    if (everConnected.current && latest.current.enabled) {
      void store.getState().refresh();
      if (latest.current.proposals && store.getState().goal.data?.goal != null) void store.getState().loadProposals();
    }
    everConnected.current = true;
  }, [connected, store]);
}
