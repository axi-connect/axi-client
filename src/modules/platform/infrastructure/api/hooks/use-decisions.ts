"use client";

/**
 * Hooks del motor de decisiones (P1b). Guardar una ruta invalida la lista:
 * el estado del cortacircuito y los pares elegibles salen siempre del servidor.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DecisionPurpose, UpdateDecisionRouteDTO } from "../../../domain/decisions";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export function useDecisionRoutesQuery() {
  return useQuery({
    queryKey: platformKeys.decisions.routes(),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/ai/decisions/routes");
      return data!;
    },
    staleTime: 30_000,
  });
}

export function useDecisionHealthQuery(hours: number) {
  return useQuery({
    queryKey: platformKeys.decisions.health(hours),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/ai/decisions/health", {
        params: { query: { hours } },
      });
      return data!;
    },
    staleTime: 30_000,
  });
}

export function useSaveDecisionRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ purpose, body }: { purpose: DecisionPurpose; body: UpdateDecisionRouteDTO }) => {
      const { data } = await platformClient.PUT("/api/v1/platform/ai/decisions/routes/{purpose}", {
        params: { path: { purpose } },
        body,
      });
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.decisions.all }),
  });
}
