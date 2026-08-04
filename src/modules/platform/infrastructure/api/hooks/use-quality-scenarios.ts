"use client";

/**
 * Hooks del catálogo de escenarios de calidad. Las listas PAGINAN EN SERVER
 * (`page`/`page_size`, excepción a D5): los filtros viajan en la query key y
 * `keepPreviousData` evita el parpadeo al cambiar de página/filtro.
 * Gotcha del contrato: `is_system` viaja como string `"true"/"false"`.
 * Mutaciones sin optimistic updates (D9): 201/204 → invalidar el recurso.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CatalogStatus,
  CloneScenarioDTO,
  CreateScenarioDTO,
  UpdateScenarioDTO,
} from "../../../domain/quality";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export type ScenariosFilters = {
  status?: CatalogStatus;
  isSystem?: boolean;
  search?: string;
  page: number;
  pageSize: number;
};

export function useScenariosQuery(filters: ScenariosFilters, opts?: { enabled?: boolean }) {
  const search = filters.search?.trim() || undefined;
  return useQuery({
    enabled: opts?.enabled ?? true,
    queryKey: platformKeys.quality.scenarios.list({
      status: filters.status ?? null,
      is_system: filters.isSystem ?? null,
      search: search ?? null,
      page: filters.page,
      page_size: filters.pageSize,
    }),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/quality/scenarios", {
        params: {
          query: {
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.isSystem !== undefined
              ? { is_system: filters.isSystem ? ("true" as const) : ("false" as const) }
              : {}),
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

/** Detalle por id — para abrir en edición un escenario que no está en la página actual (p.ej. recién clonado). */
export function useScenarioQuery(id: string | null) {
  return useQuery({
    queryKey: platformKeys.quality.scenarios.detail(id ?? "none"),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/quality/scenarios/{id}", {
        params: { path: { id: id! } },
      });
      return data!;
    },
    enabled: id !== null,
    staleTime: 30_000,
  });
}

export function useCreateScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateScenarioDTO) => {
      const { data } = await platformClient.POST("/api/v1/platform/quality/scenarios", { body });
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.quality.scenarios.all }),
  });
}

export function useUpdateScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateScenarioDTO }) => {
      await platformClient.PATCH("/api/v1/platform/quality/scenarios/{id}", {
        params: { path: { id } },
        body,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.quality.scenarios.all }),
  });
}

/** DELETE = ARCHIVA (no borra): el escenario deja de ser elegible en suites/ejecuciones nuevas. */
export function useArchiveScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await platformClient.DELETE("/api/v1/platform/quality/scenarios/{id}", {
        params: { path: { id } },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.quality.scenarios.all }),
  });
}

export function useCloneScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: CloneScenarioDTO }) => {
      const { data } = await platformClient.POST("/api/v1/platform/quality/scenarios/{id}/clone", {
        params: { path: { id } },
        body,
      });
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.quality.scenarios.all }),
  });
}
