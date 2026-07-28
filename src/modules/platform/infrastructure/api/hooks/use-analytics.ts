"use client";

/**
 * Hooks de analytics cross-tenant (triage de agentes + alertas de
 * plataforma). Poll de 60 s + refetch al enfocar la ventana (spec §2.3),
 * pausado con el ReLoginModal abierto.
 *
 * Dedupe del badge del sidebar: `useTriggeredAlertsCount` usa LA MISMA query
 * key que el tab "Alertas · disparadas" y solo proyecta `meta.total` con
 * `select` → una única request alimenta badge y tabla.
 */
import { useQuery } from "@tanstack/react-query";
import type { AlertStatus } from "../../../domain/analytics";
import { analyticsPollInterval } from "../../../domain/polling";
import { usePlatformAuth } from "../../auth/platform-auth.context";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export function useAgentsHealthQuery(days: number) {
  const { reloginOpen } = usePlatformAuth();

  return useQuery({
    queryKey: platformKeys.analytics.agentsHealth(days),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/analytics/agents-health", {
        params: { query: { days } },
      });
      return data!;
    },
    staleTime: 30_000,
    refetchInterval: () => analyticsPollInterval(reloginOpen),
    refetchOnWindowFocus: true,
  });
}

async function fetchAlerts(status: AlertStatus) {
  const { data } = await platformClient.GET("/api/v1/platform/analytics/alerts", {
    params: { query: { status } },
  });
  return data!;
}

export function useAlertsQuery(status: AlertStatus) {
  const { reloginOpen } = usePlatformAuth();

  return useQuery({
    queryKey: platformKeys.analytics.alerts(status),
    queryFn: () => fetchAlerts(status),
    staleTime: 30_000,
    refetchInterval: () => analyticsPollInterval(reloginOpen),
    refetchOnWindowFocus: true,
  });
}

/** Total de alertas disparadas (badge del sidebar y stat del dashboard). */
export function useTriggeredAlertsCount() {
  const { reloginOpen } = usePlatformAuth();

  return useQuery({
    // Misma key que el tab triggered → una sola request compartida.
    queryKey: platformKeys.analytics.alerts("triggered"),
    queryFn: () => fetchAlerts("triggered"),
    staleTime: 30_000,
    refetchInterval: () => analyticsPollInterval(reloginOpen),
    refetchOnWindowFocus: true,
    select: (payload) => payload.meta.total,
  });
}
