"use client";

/**
 * Tablero «Capacidades» (upgrade quality F5) y borrador «Convertir en
 * escenario». El borrador es una mutación (llama a un modelo; no persiste).
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export function useCapabilitiesQuery(companyId: string | null) {
  return useQuery({
    queryKey: platformKeys.quality.capabilities(companyId ?? "none"),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/quality/capabilities", {
        params: { query: { company_id: companyId! } },
      });
      return data!;
    },
    enabled: companyId !== null,
    staleTime: 30_000,
  });
}

export function useDraftScenarioFromConversation() {
  return useMutation({
    mutationFn: async (body: { company_id: string; conversation_id: string }) => {
      const { data } = await platformClient.POST("/api/v1/platform/quality/scenarios/draft-from-conversation", { body });
      return data!;
    },
  });
}
