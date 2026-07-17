"use client";

/**
 * Hooks del recurso planes comerciales. Mutaciones 201/204 →
 * `invalidateQueries` (nunca optimistic, spec D9).
 * Nota de contrato: en el PATCH `default_limits` es requerido — toda edición
 * (incluido activar/desactivar) reenvía el set vigente.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreatePlanDTO, UpdatePlanDTO } from "../../../domain/plan";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export function usePlansQuery() {
  return useQuery({
    queryKey: platformKeys.plans.list(),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/plans");
      return data!;
    },
    staleTime: 60_000,
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreatePlanDTO) => {
      const { data } = await platformClient.POST("/api/v1/platform/plans", { body });
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.plans.all }),
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdatePlanDTO }) => {
      await platformClient.PATCH("/api/v1/platform/plans/{id}", {
        params: { path: { id } },
        body,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.plans.all }),
  });
}
