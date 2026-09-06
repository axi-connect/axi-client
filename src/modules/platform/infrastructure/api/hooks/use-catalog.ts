"use client";

/**
 * Hooks del catálogo de dos ejes (Tanda A2): tramos, promociones, parámetros,
 * previsualización pública y publicación por lote. Mutaciones →
 * `invalidateQueries` sobre toda la familia de facturación: publicar una celda
 * cambia también el histórico de tarifas y la vista pública.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreatePromotionDTO,
  CreateVolumeTierDTO,
  DeclareAcquisitionCostDTO,
  ManualRedemptionDTO,
  PublishCapabilityCostDTO,
  PublishGatewayFeeDTO,
  PublishParameterDTO,
  PublishPlanCostOverrideDTO,
  PublishPriceBatchDTO,
  UpdateAcquisitionCostDTO,
  UpdatePromotionDTO,
  UpdateVolumeTierDTO,
} from "../../../domain/billing";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

/** Todas las celdas de todos los planes: la rejilla de dos ejes las necesita juntas. */
export function useAllBillingPricesQuery() {
  return useQuery({
    queryKey: platformKeys.billing.prices(),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/billing/prices", {
        params: { query: {} },
      });
      return data!;
    },
    staleTime: 60_000,
  });
}

export function useVolumeTiersQuery() {
  return useQuery({
    queryKey: platformKeys.billing.tiers(),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/billing/volume-tiers");
      return data!;
    },
  });
}

export function useCreateVolumeTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateVolumeTierDTO) => {
      const { data } = await platformClient.POST("/api/v1/platform/billing/volume-tiers", { body });
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.billing.all }),
  });
}

export function useUpdateVolumeTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { tierId: string; body: UpdateVolumeTierDTO }) => {
      await platformClient.PATCH("/api/v1/platform/billing/volume-tiers/{tier_id}", {
        params: { path: { tier_id: input.tierId } },
        body: input.body,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.billing.all }),
  });
}

export function usePromotionsQuery() {
  return useQuery({
    queryKey: platformKeys.billing.promotions(),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/billing/promotions");
      return data!;
    },
  });
}

export function useCreatePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreatePromotionDTO) => {
      const { data } = await platformClient.POST("/api/v1/platform/billing/promotions", { body });
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.billing.all }),
  });
}

export function useUpdatePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { promotionId: string; body: UpdatePromotionDTO }) => {
      await platformClient.PATCH("/api/v1/platform/billing/promotions/{promotion_id}", {
        params: { path: { promotion_id: input.promotionId } },
        body: input.body,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.billing.all }),
  });
}

export function useClosePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (promotionId: string) => {
      await platformClient.POST("/api/v1/platform/billing/promotions/{promotion_id}/close", {
        params: { path: { promotion_id: promotionId } },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.billing.all }),
  });
}

export function useAddManualRedemption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { promotionId: string; body: ManualRedemptionDTO }) => {
      const { data } = await platformClient.POST(
        "/api/v1/platform/billing/promotions/{promotion_id}/redemptions",
        { params: { path: { promotion_id: input.promotionId } }, body: input.body },
      );
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.billing.all }),
  });
}

export function useSetRedemptionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      promotionId: string;
      redemptionId: string;
      status: "active" | "released";
    }) => {
      await platformClient.PATCH(
        "/api/v1/platform/billing/promotions/{promotion_id}/redemptions/{redemption_id}",
        {
          params: { path: { promotion_id: input.promotionId, redemption_id: input.redemptionId } },
          body: { status: input.status },
        },
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.billing.all }),
  });
}

export function useBillingParametersQuery() {
  return useQuery({
    queryKey: platformKeys.billing.parameters(),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/billing/parameters");
      return data!;
    },
  });
}

export function usePublishParameter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: PublishParameterDTO) => {
      const { data } = await platformClient.POST("/api/v1/platform/billing/parameters", { body });
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.billing.all }),
  });
}

/** Lo que verá el visitante en `at` (ISO). Sin `at`, ahora. */
export function usePricingPreviewQuery(at?: string) {
  return useQuery({
    queryKey: platformKeys.billing.preview(at),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/billing/pricing-preview", {
        params: { query: at === undefined ? {} : { at } },
      });
      return data!;
    },
  });
}

/** Una vigencia completa en una transacción: las 36 celdas de paquete. */
export function usePublishPriceBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: PublishPriceBatchDTO) => {
      const { data } = await platformClient.POST("/api/v1/platform/billing/prices/batch", { body });
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.billing.all }),
  });
}

/* ───────────── consola de margen (Tanda C): parámetros declarados nuevos ───────────── */

export function useGatewayFeesQuery() {
  return useQuery({
    queryKey: platformKeys.billing.gatewayFees(),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/billing/gateway-fees");
      return data!;
    },
  });
}

export function usePublishGatewayFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: PublishGatewayFeeDTO) => {
      const { data } = await platformClient.POST("/api/v1/platform/billing/gateway-fees", { body });
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.billing.all }),
  });
}

export function useCapabilityCostsQuery() {
  return useQuery({
    queryKey: platformKeys.billing.capabilityCosts(),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/billing/capability-costs");
      return data!;
    },
  });
}

export function usePublishCapabilityCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: PublishCapabilityCostDTO) => {
      const { data } = await platformClient.POST("/api/v1/platform/billing/capability-costs", { body });
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.billing.all }),
  });
}

export function usePublishPlanCostOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: PublishPlanCostOverrideDTO) => {
      const { data } = await platformClient.POST("/api/v1/platform/billing/capability-costs/overrides", { body });
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.billing.all }),
  });
}

export function useAcquisitionCostsQuery() {
  return useQuery({
    queryKey: platformKeys.billing.acquisitionCosts(),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/billing/acquisition-costs");
      return data!;
    },
  });
}

export function useDeclareAcquisitionCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: DeclareAcquisitionCostDTO) => {
      const { data } = await platformClient.POST("/api/v1/platform/billing/acquisition-costs", { body });
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.billing.all }),
  });
}

export function useUpdateAcquisitionCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; body: UpdateAcquisitionCostDTO }) => {
      await platformClient.PATCH("/api/v1/platform/billing/acquisition-costs/{id}", {
        params: { path: { id: input.id } },
        body: input.body,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.billing.all }),
  });
}
