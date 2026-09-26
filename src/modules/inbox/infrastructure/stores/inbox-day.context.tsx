"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { isHttpError } from "@/core/api/problem";
import type { InboxConversation, InboxStats } from "@/modules/inbox/domain/inbox";
import { listInboxConversations, getInboxStats } from "@/modules/inbox/infrastructure/services/inbox-service.adapter";
import { buildInboxQuery } from "@/modules/inbox/infrastructure/stores/inbox-query";
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store";

/**
 * «Tu día» y la cabeza de la cola (F1), resueltos UNA vez para la vista: la isla
 * «Lo próximo» del panel vacío, la franja del celular y el subtítulo de «En cola»
 * leen lo mismo sin repetir peticiones (mismo patrón que `ContactContextProvider`).
 *
 * Frescura, sin evento WS propio. La señal es `countsVersion`, que sube con cada
 * lectura de `/inbox/counts`, y esa lectura ya la disparan los eventos de handoff
 * del socket:
 * - La cabeza de la cola se relee con cada `countsVersion`. Es una fila (`page_size: 1`)
 *   y cambia con cada claim o escalamiento.
 * - `/inbox/stats` se relee con `countsVersion` o al volver la pestaña a visible, como
 *   mucho una vez cada {@link STATS_MIN_INTERVAL_MS}: son siete conteos en el servidor
 *   y el día no cambia por segundos.
 *
 * Solo se pide lo de la vista abierta. Nada de esto es por fila: la lista no
 * dispara peticiones por conversación (plan §8, N+1).
 */

export const STATS_MIN_INTERVAL_MS = 60_000;

export type InboxDayStatsStatus = "loading" | "ready" | "error" | "forbidden";

export interface InboxDay {
  stats: InboxStats | null;
  statsStatus: InboxDayStatsStatus;
  /** La conversación que más lleva en cola; `null` sin cola o mientras llega. */
  head: InboxConversation | null;
  reloadStats: () => void;
}

const InboxDayValue = createContext<InboxDay | null>(null);

export function InboxDayProvider({ children }: { children: React.ReactNode }) {
  const value = useInboxDayState();
  return <InboxDayValue.Provider value={value}>{children}</InboxDayValue.Provider>;
}

export function useInboxDay(): InboxDay {
  const value = useContext(InboxDayValue);
  if (value === null) throw new Error("useInboxDay requiere <InboxDayProvider> (se monta en InboxView)");
  return value;
}

function useInboxDayState(): InboxDay {
  const countsVersion = useInboxStore((s) => s.countsVersion);
  const queued = useInboxStore((s) => s.counts?.queued ?? null);

  const [stats, setStats] = useState<InboxStats | null>(null);
  const [statsStatus, setStatsStatus] = useState<InboxDayStatsStatus>("loading");
  const [head, setHead] = useState<InboxConversation | null>(null);

  const lastStatsAt = useRef<number | null>(null);
  const statsTurn = useRef(0);
  const headTurn = useRef(0);

  const loadStats = useCallback((force: boolean) => {
    const now = Date.now();
    if (!force && lastStatsAt.current !== null && now - lastStatsAt.current < STATS_MIN_INTERVAL_MS) return;
    lastStatsAt.current = now;
    const turn = ++statsTurn.current;
    getInboxStats("today")
      .then((data) => {
        if (turn !== statsTurn.current) return;
        setStats(data);
        setStatsStatus("ready");
      })
      .catch((error: unknown) => {
        if (turn !== statsTurn.current) return;
        // Con el dato anterior a la vista, un fallo de refresco no lo borra.
        setStatsStatus((current) =>
          isHttpError(error) && error.status === 403 ? "forbidden" : current === "ready" ? "ready" : "error",
        );
      });
  }, []);

  // Primera lectura y cada vez que la bandeja cambia (acotado por el intervalo).
  useEffect(() => {
    loadStats(false);
  }, [countsVersion, loadStats]);

  // Volver a la pestaña es volver a mirar: se relee si ya pasó el intervalo.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") loadStats(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadStats]);

  // La cabeza de la cola: solo cuando hay cola, con turno para no pisar la actual.
  useEffect(() => {
    if (queued === null) return;
    const turn = ++headTurn.current;
    if (queued === 0) {
      setHead(null);
      return;
    }
    listInboxConversations({
      ...buildInboxQuery({ view: "queued", sort: "waiting", q: "", filters: {}, page: 1 }),
      page_size: 1,
    })
      .then((res) => {
        if (turn === headTurn.current) setHead(res.data[0] ?? null);
      })
      .catch(() => {
        // La isla se queda con la cabeza que tenía; el conteo sigue siendo fiable.
      });
  }, [countsVersion, queued]);

  const reloadStats = useCallback(() => {
    setStatsStatus((current) => (current === "ready" ? current : "loading"));
    loadStats(true);
  }, [loadStats]);

  return { stats, statsStatus, head, reloadStats };
}

/**
 * Lo mismo, pero `null` fuera del proveedor: para piezas de la lista que
 * también se montan solas (sus tests renderizan `<InboxList />` sin la vista).
 */
export function useInboxDayIfMounted(): InboxDay | null {
  return useContext(InboxDayValue);
}
