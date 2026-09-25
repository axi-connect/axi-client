"use client";

/**
 * Agentes IA de un tenant desde /platform (`GET /platform/tenants/{id}/agents`).
 * Cierra el gap del wizard de calidad, que filtraba `agents-health?days=1` en
 * cliente y no veía agentes sin tráfico reciente. Los clones [QA-mock] ya
 * vienen excluidos del payload.
 */
import { useQuery } from "@tanstack/react-query";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export function useTenantAgentsQuery(companyId: string | null, status?: "active" | "paused" | "draft") {
  return useQuery({
    queryKey: platformKeys.tenants.agents(companyId ?? "", status),
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/tenants/{id}/agents", {
        params: { path: { id: companyId ?? "" }, query: status ? { status } : {} },
      });
      return data!;
    },
    staleTime: 30_000,
  });
}
