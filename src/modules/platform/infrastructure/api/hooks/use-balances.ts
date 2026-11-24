"use client";

/**
 * Dinero › Saldos (alerta de saldos de proveedores, 24-nov). La lista se
 * refresca sola cada minuto; la franja del panel, cada minuto también y al
 * volver a la pestaña — es la que tiene que verse cuando algo se cae.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProviderBalances, UpdateProviderBalanceDTO } from "../../../domain/balances";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

const REFRESH_MS = 60_000;

export function useBalancesQuery() {
  return useQuery({
    queryKey: platformKeys.balances.list(),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/balances");
      return data!;
    },
    staleTime: 30_000,
    refetchInterval: REFRESH_MS,
  });
}

export function useBalanceAlertsQuery() {
  return useQuery({
    queryKey: platformKeys.balances.alerts(),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/balances/alerts");
      return data!;
    },
    staleTime: 30_000,
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
  });
}

/** Las mutaciones devuelven la vista ya recalculada: se escribe en la caché y se invalida la franja. */
function useSettle() {
  const client = useQueryClient();
  return (data: ProviderBalances) => {
    client.setQueryData(platformKeys.balances.list(), data);
    void client.invalidateQueries({ queryKey: platformKeys.balances.alerts() });
  };
}

export function useRefreshBalances() {
  const settle = useSettle();
  return useMutation({
    mutationFn: async () => {
      const { data } = await platformClient.POST("/api/v1/platform/balances/refresh");
      return data!;
    },
    onSuccess: settle,
  });
}

export function useUpdateBalance(provider: string) {
  const settle = useSettle();
  return useMutation({
    mutationFn: async (body: UpdateProviderBalanceDTO) => {
      const { data } = await platformClient.PATCH("/api/v1/platform/balances/{provider}", {
        params: { path: { provider } },
        body,
      });
      return data!;
    },
    onSuccess: settle,
  });
}

export function useResolveIncident() {
  const settle = useSettle();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await platformClient.POST("/api/v1/platform/balances/incidents/{id}/resolve", {
        params: { path: { id } },
      });
      return data!;
    },
    onSuccess: settle,
  });
}
