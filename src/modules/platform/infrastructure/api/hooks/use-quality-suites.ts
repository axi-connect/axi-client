"use client";

/**
 * Hooks del catálogo de suites de calidad. Misma política que escenarios
 * (paginación server + keepPreviousData; mutaciones → invalidar, D9).
 * `useSetSuiteScenarios` es un PUT de REEMPLAZO TOTAL: el orden del array
 * define `position` (1–50 ids, sin duplicados — el sheet lo garantiza).
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CatalogStatus, CreateSuiteDTO, UpdateSuiteDTO } from "../../../domain/quality";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export type SuitesFilters = {
  status?: CatalogStatus;
  search?: string;
  page: number;
  pageSize: number;
};

export function useSuitesQuery(filters: SuitesFilters) {
  const search = filters.search?.trim() || undefined;
  return useQuery({
    queryKey: platformKeys.quality.suites.list({
      status: filters.status ?? null,
      search: search ?? null,
      page: filters.page,
      page_size: filters.pageSize,
    }),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/quality/suites", {
        params: {
          query: {
            ...(filters.status ? { status: filters.status } : {}),
            ...(search ? { search } : {}),
            page: filters.page,
            page_size: filters.pageSize,
          },
        },
      });
      return data!;
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

/** Detalle con la composición (`scenarios[{position, scenario}]`). */
export function useSuiteQuery(id: string | null) {
  return useQuery({
    queryKey: platformKeys.quality.suites.detail(id ?? "none"),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/quality/suites/{id}", {
        params: { path: { id: id! } },
      });
      return data!;
    },
    enabled: id !== null,
    staleTime: 30_000,
  });
}

export function useCreateSuite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateSuiteDTO) => {
      const { data } = await platformClient.POST("/api/v1/platform/quality/suites", { body });
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.quality.suites.all }),
  });
}

export function useUpdateSuite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateSuiteDTO }) => {
      await platformClient.PATCH("/api/v1/platform/quality/suites/{id}", {
        params: { path: { id } },
        body,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.quality.suites.all }),
  });
}

export function useSetSuiteScenarios() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, scenarioIds }: { id: string; scenarioIds: string[] }) => {
      await platformClient.PUT("/api/v1/platform/quality/suites/{id}/scenarios", {
        params: { path: { id } },
        body: { scenario_ids: scenarioIds },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.quality.suites.all }),
  });
}
