"use client";

/**
 * Hooks del pricing de modelos IA.
 * - POST = UPSERT por (provider, model, effective_from) — la UI lo advierte.
 * - PATCH solo costos/margen/effective_to; `margin_multiplier` es REQUERIDO
 *   en el DTO → siempre viaja. Mutaciones → invalidate dirigida.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreatePricingDTO, UpdatePricingDTO } from "../../../domain/pricing";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export function usePricingQuery() {
  return useQuery({
    queryKey: platformKeys.pricing.list(),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/pricing");
      return data!;
    },
    staleTime: 60_000,
  });
}

export function useCreatePricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreatePricingDTO) => {
      const { data } = await platformClient.POST("/api/v1/platform/pricing", { body });
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.pricing.all }),
  });
}

export function useUpdatePricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdatePricingDTO }) => {
      await platformClient.PATCH("/api/v1/platform/pricing/{pricingId}", {
        params: { path: { pricingId: id } },
        body,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.pricing.all }),
  });
}
