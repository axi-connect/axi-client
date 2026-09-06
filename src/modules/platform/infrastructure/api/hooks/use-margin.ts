"use client";

/**
 * Hooks de la consola de margen (Tanda C3). Solo lectura y simulación: aquí no
 * se publica nada. La muestra la cachea el servidor 15 min por ventana/tenant/
 * plan; el cliente no la recalcula ni la reinterpreta.
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import type { SimulateMarginDTO } from "../../../domain/margin";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export function useMarginSampleQuery(input: { windowDays: number; companyId?: string; planCode?: string }) {
  return useQuery({
    queryKey: platformKeys.billing.marginSample(input.windowDays, input.companyId, input.planCode),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/billing/margin/sample", {
        params: {
          query: {
            window_days: input.windowDays,
            ...(input.companyId ? { company_id: input.companyId } : {}),
            ...(input.planCode ? { plan_code: input.planCode } : {}),
          },
        },
      });
      return data!;
    },
    staleTime: 60_000,
  });
}

/** Las 36 celdas vigentes con su margen: lo que la verja rechazaría hoy, antes de publicar. */
export function useMarginCellsQuery(windowDays = 30) {
  return useQuery({
    queryKey: platformKeys.billing.marginCells(windowDays),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/billing/margin/cells", {
        params: { query: { window_days: windowDays } },
      });
      return data!;
    },
    staleTime: 60_000,
  });
}

export function useSimulateMargin() {
  return useMutation({
    mutationFn: async (body: SimulateMarginDTO) => {
      const { data } = await platformClient.POST("/api/v1/platform/billing/margin/simulate", { body });
      return data!;
    },
  });
}
