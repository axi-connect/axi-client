"use client";

/**
 * Lecturas del tenant para el etiquetado (upgrade quality F4): buscar un
 * producto del catálogo (debounce lo hace quien escribe) e intenciones
 * (system + propias). Solo lectura, sin costo.
 */
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export function useTenantCatalogSearch(companyId: string | null, q: string, limit = 8) {
  const query = q.trim();
  return useQuery({
    queryKey: platformKeys.quality.tenantLookup.catalog(companyId ?? "none", query),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/quality/tenants/{companyId}/catalog/search", {
        params: { path: { companyId: companyId! }, query: { q: query, limit } },
      });
      return data!.data;
    },
    enabled: companyId !== null && query.length > 0,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useTenantIntentions(companyId: string | null) {
  return useQuery({
    queryKey: platformKeys.quality.tenantLookup.intentions(companyId ?? "none"),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/quality/tenants/{companyId}/intentions", {
        params: { path: { companyId: companyId! } },
      });
      return data!.data;
    },
    enabled: companyId !== null,
    staleTime: 5 * 60 * 1000,
  });
}
