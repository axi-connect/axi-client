"use client";

/**
 * Hooks del plan y los límites de UN tenant (tab Plan & Límites).
 * - Asignar plan re-siembra los límites `source: plan` → tras el 204 se
 *   invalida el plan del tenant (y la lista de planes: `subscriptions_count`).
 * - PUT limits REEMPLAZA el set completo → invalidate del plan del tenant
 *   (los límites efectivos con `source` viven en esa query).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReplaceTenantLimitsDTO } from "../../../domain/plan";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export function useTenantPlanQuery(tenantId: string) {
  return useQuery({
    queryKey: platformKeys.tenants.plan(tenantId),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/tenants/{id}/plan", {
        params: { path: { id: tenantId } },
      });
      return data!;
    },
    staleTime: 30_000,
  });
}

export function useAssignTenantPlan(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (planId: string) => {
      await platformClient.PUT("/api/v1/platform/tenants/{id}/plan", {
        params: { path: { id: tenantId } },
        body: { plan_id: planId },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: platformKeys.tenants.plan(tenantId) });
      void queryClient.invalidateQueries({ queryKey: platformKeys.tenants.limits(tenantId) });
      // subscriptions_count cambia en el catálogo de planes.
      void queryClient.invalidateQueries({ queryKey: platformKeys.plans.all });
    },
  });
}

export function useReplaceTenantLimits(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: ReplaceTenantLimitsDTO) => {
      await platformClient.PUT("/api/v1/platform/tenants/{id}/limits", {
        params: { path: { id: tenantId } },
        body,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: platformKeys.tenants.plan(tenantId) });
      void queryClient.invalidateQueries({ queryKey: platformKeys.tenants.limits(tenantId) });
    },
  });
}
