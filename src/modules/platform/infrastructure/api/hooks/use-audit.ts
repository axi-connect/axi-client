"use client";

/**
 * Hook del visor de auditoría. Sin paginación server: solo `limit` (≤200,
 * garantizado por el catálogo AUDIT_LIMITS). La query key incluye los
 * filtros → caché por combinación; `keepPreviousData` evita que la lista
 * parpadee al cambiar de filtro.
 */
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { DEFAULT_AUDIT_LIMIT } from "../../../domain/audit";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export type AuditFilters = {
  companyId?: string;
  action?: string;
  limit?: number;
};

export function useAuditLogsQuery(filters: AuditFilters) {
  const limit = Math.min(filters.limit ?? DEFAULT_AUDIT_LIMIT, 200);

  return useQuery({
    queryKey: platformKeys.audit.list({
      company_id: filters.companyId ?? null,
      action: filters.action ?? null,
      limit,
    }),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/audit-logs", {
        params: {
          query: {
            ...(filters.companyId ? { company_id: filters.companyId } : {}),
            ...(filters.action ? { action: filters.action } : {}),
            limit,
          },
        },
      });
      return data!;
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
