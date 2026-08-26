"use client";

/**
 * Hooks de facturación de plataforma. Mutaciones → `invalidateQueries` (nunca
 * optimistic, spec D9).
 *
 * Las tres acciones de administración de factura devuelven el mismo
 * `InvoiceAdministrationDto` con el estado recalculado: se usa **ese** resultado
 * para el aviso al operador, e igualmente se invalida la lista porque una
 * factura saldada cambia también el estado de la cuenta.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  PublishPriceDTO,
  UpdateTenantBillingDTO,
} from "../../../domain/billing";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export type InvoiceFilters = {
  company_id?: string;
  status?:
    | "draft"
    | "open"
    | "partially_paid"
    | "paid"
    | "void"
    | "uncollectible";
  /** ⚠️ El backend lo declara como string en el query, no como boolean. */
  overdue?: boolean;
  page?: number;
  page_size?: number;
};

/** Cartera. `overdue: true` es la vista de cobranza y el default de la pantalla. */
export function usePlatformInvoicesQuery(filters: InvoiceFilters) {
  return useQuery({
    queryKey: platformKeys.billing.invoices(filters),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/billing/invoices", {
        params: {
          query: {
            ...(filters.company_id ? { company_id: filters.company_id } : {}),
            ...(filters.status ? { status: filters.status } : {}),
            // Viaja como string porque así lo declara el DTO del backend.
            ...(filters.overdue ? { overdue: "true" } : {}),
            page: filters.page ?? 1,
            page_size: filters.page_size ?? 20,
          },
        },
      });
      return data!;
    },
  });
}

export function useRegisterWithholding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      invoiceId: string;
      company_id: string;
      withholding_cents: number;
    }) => {
      const { data } = await platformClient.POST(
        "/api/v1/platform/billing/invoices/{invoice_id}/withholding",
        {
          params: { path: { invoice_id: input.invoiceId } },
          body: {
            company_id: input.company_id,
            withholding_cents: input.withholding_cents,
          },
        },
      );
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.billing.all }),
  });
}

export function useVoidInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { invoiceId: string; company_id: string; reason: string }) => {
      const { data } = await platformClient.POST(
        "/api/v1/platform/billing/invoices/{invoice_id}/void",
        {
          params: { path: { invoice_id: input.invoiceId } },
          body: { company_id: input.company_id, reason: input.reason },
        },
      );
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.billing.all }),
  });
}

export function useAddAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      invoiceId: string;
      company_id: string;
      kind: "adjustment" | "credit";
      description: string;
      amount_cents: number;
    }) => {
      const { data } = await platformClient.POST(
        "/api/v1/platform/billing/invoices/{invoice_id}/adjustments",
        {
          params: { path: { invoice_id: input.invoiceId } },
          body: {
            company_id: input.company_id,
            kind: input.kind,
            description: input.description,
            amount_cents: input.amount_cents,
            // Explícitos aunque el backend tenga defaults: un ajuste sobre una
            // licencia excluida de IVA no lleva impuesto, y dejarlo implícito
            // haría que el día que cambie el default cambie la contabilidad.
            tax_treatment: "excluded",
            tax_rate_bps: 0,
          },
        },
      );
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.billing.all }),
  });
}

/**
 * Histórico COMPLETO de vigencias de un plan, no solo la tarifa vigente: es lo
 * que explica por qué una factura de junio dice otro importe.
 *
 * `planId` es obligatorio aquí aunque el endpoint lo acepte opcional. El spec lo
 * declaraba requerido por un `@Query()` sin `@ApiQuery` (arreglado en el backend,
 * `964b4b4`, pendiente de regenerar el OpenAPI), y da igual: la pantalla es por
 * plan, así que pedir el catálogo entero no le sirve de nada.
 */
export function useBillingPricesQuery(planId: string | undefined) {
  return useQuery({
    queryKey: platformKeys.billing.prices(planId),
    enabled: planId !== undefined,
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/billing/prices", {
        params: { query: { plan_id: planId! } },
      });
      return data!;
    },
    staleTime: 60_000,
  });
}

/**
 * Publica una tarifa nueva. **No existe un PATCH del importe y no hay que
 * pedirlo**: una factura ya emitida debe conservar el precio con el que se
 * vendió, así que publicar cierra la vigencia anterior y crea una fila nueva.
 */
export function usePublishPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: PublishPriceDTO) => {
      const { data } = await platformClient.POST("/api/v1/platform/billing/prices", { body });
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.billing.all }),
  });
}

export function useSetPriceActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { priceId: string; is_active: boolean }) => {
      await platformClient.PATCH("/api/v1/platform/billing/prices/{price_id}/active", {
        params: { path: { price_id: input.priceId } },
        body: { is_active: input.is_active },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.billing.all }),
  });
}

export function useTenantBillingQuery(tenantId: string) {
  return useQuery({
    queryKey: platformKeys.billing.tenant(tenantId),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/tenants/{id}/billing", {
        params: { path: { id: tenantId } },
      });
      return data!;
    },
  });
}

export function useUpdateTenantBilling(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateTenantBillingDTO) => {
      await platformClient.PATCH("/api/v1/platform/tenants/{id}/billing", {
        params: { path: { id: tenantId } },
        body,
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: platformKeys.billing.tenant(tenantId) }),
  });
}

/** Mueve la fecha de corte del ciclo. */
export function useSetBillingCycle(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (billingCycleAnchor: string) => {
      await platformClient.PUT("/api/v1/platform/tenants/{id}/billing/cycle", {
        params: { path: { id: tenantId } },
        body: { billing_cycle_anchor: billingCycleAnchor },
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: platformKeys.billing.tenant(tenantId) }),
  });
}
