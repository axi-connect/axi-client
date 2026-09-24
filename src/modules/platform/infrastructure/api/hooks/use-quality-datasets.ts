"use client";

/**
 * Hooks de los datasets etiquetados (upgrade quality F4). Listas paginadas
 * en server con `keepPreviousData`; los ítems se piden por estado de
 * etiqueta (el banco de etiquetado recorre «Sin etiquetar»). Mutaciones sin
 * optimistic updates (D9): 201/204/202 → invalidar el recurso.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AddDatasetItemDTO,
  CreateDatasetDTO,
  DatasetKind,
  ImportDatasetDTO,
  LabelDatasetItemDTO,
  LabelStatus,
  UpdateDatasetDTO,
} from "../../../domain/quality-datasets";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export type DatasetsFilters = {
  companyId?: string;
  kind?: DatasetKind;
  status?: "active" | "archived";
  page: number;
  pageSize: number;
};

export function useDatasetsQuery(filters: DatasetsFilters) {
  return useQuery({
    queryKey: platformKeys.quality.datasets.list({
      company_id: filters.companyId ?? null,
      kind: filters.kind ?? null,
      status: filters.status ?? null,
      page: filters.page,
      page_size: filters.pageSize,
    }),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/quality/datasets", {
        params: {
          query: {
            ...(filters.companyId ? { company_id: filters.companyId } : {}),
            ...(filters.kind ? { kind: filters.kind } : {}),
            ...(filters.status ? { status: filters.status } : {}),
            page: filters.page,
            page_size: filters.pageSize,
          },
        },
      });
      return data!;
    },
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });
}

/**
 * M11: tras lanzar una importación (202) el detalle se pollea cada 2 s hasta
 * que llega un `last_import` posterior al arranque o pasan 60 s.
 */
export function useDatasetQuery(id: string | null, opts?: { importStartedAt?: number | null }) {
  const queryClient = useQueryClient();
  const since = opts?.importStartedAt ?? null;
  return useQuery({
    queryKey: platformKeys.quality.datasets.detail(id ?? "none"),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/quality/datasets/{id}", {
        params: { path: { id: id! } },
      });
      const fresh = data!;
      if (since !== null && importFinishedAfter(fresh.last_import, since)) {
        // El import terminó: los ítems nuevos se releen
        void queryClient.invalidateQueries({ queryKey: platformKeys.quality.datasets.items(fresh.id) });
      }
      return fresh;
    },
    enabled: id !== null,
    staleTime: 2_000,
    refetchInterval: (query) => {
      if (since === null) return false;
      if (Date.now() - since > IMPORT_POLL_WINDOW_MS) return false;
      return importFinishedAfter(query.state.data?.last_import ?? null, since) ? false : IMPORT_POLL_MS;
    },
  });
}

export const IMPORT_POLL_MS = 2_000;
export const IMPORT_POLL_WINDOW_MS = 60_000;

/** ¿Hay un resumen de importación terminado después de `since`? */
export function importFinishedAfter(lastImport: { finished_at: string } | null | undefined, since: number): boolean {
  if (!lastImport) return false;
  return new Date(lastImport.finished_at).getTime() >= since - 1_000;
}

export type DatasetItemsFilters = {
  labelStatus?: LabelStatus;
  page: number;
  pageSize: number;
};

export function useDatasetItemsQuery(id: string, filters: DatasetItemsFilters) {
  return useQuery({
    queryKey: platformKeys.quality.datasets.items(id, {
      label_status: filters.labelStatus ?? null,
      page: filters.page,
      page_size: filters.pageSize,
    }),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/quality/datasets/{id}/items", {
        params: {
          path: { id },
          query: {
            ...(filters.labelStatus ? { label_status: filters.labelStatus } : {}),
            page: filters.page,
            page_size: filters.pageSize,
          },
        },
      });
      return data!;
    },
    // Las URL presignadas de las fotos duran 5 min: se releen antes
    staleTime: 4 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateDatasetDTO) => {
      const { data } = await platformClient.POST("/api/v1/platform/quality/datasets", { body });
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.quality.datasets.all }),
  });
}

export function useUpdateDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateDatasetDTO }) => {
      await platformClient.PATCH("/api/v1/platform/quality/datasets/{id}", { params: { path: { id } }, body });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.quality.datasets.all }),
  });
}

export function useDeleteDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await platformClient.DELETE("/api/v1/platform/quality/datasets/{id}", { params: { path: { id } } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.quality.datasets.all }),
  });
}

/** 202: la importación corre en cola; la lista se refresca al volver. */
export function useImportDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: ImportDatasetDTO }) => {
      await platformClient.POST("/api/v1/platform/quality/datasets/{id}/imports", { params: { path: { id } }, body });
    },
    onSuccess: (_result, { id }) => {
      void queryClient.invalidateQueries({ queryKey: platformKeys.quality.datasets.detail(id) });
      void queryClient.invalidateQueries({ queryKey: platformKeys.quality.datasets.items(id) });
    },
  });
}

export function useAddDatasetItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: AddDatasetItemDTO }) => {
      const { data } = await platformClient.POST("/api/v1/platform/quality/datasets/{id}/items", {
        params: { path: { id } },
        body,
      });
      return data!;
    },
    onSuccess: (_result, { id }) => {
      void queryClient.invalidateQueries({ queryKey: platformKeys.quality.datasets.detail(id) });
      void queryClient.invalidateQueries({ queryKey: platformKeys.quality.datasets.items(id) });
    },
  });
}

export function useLabelDatasetItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, itemId, body }: { id: string; itemId: string; body: LabelDatasetItemDTO }) => {
      await platformClient.PATCH("/api/v1/platform/quality/datasets/{id}/items/{itemId}", {
        params: { path: { id, itemId } },
        body,
      });
    },
    onSuccess: (_result, { id }) => {
      void queryClient.invalidateQueries({ queryKey: platformKeys.quality.datasets.detail(id) });
      void queryClient.invalidateQueries({ queryKey: platformKeys.quality.datasets.items(id) });
    },
  });
}

export function useDeleteDatasetItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, itemId }: { id: string; itemId: string }) => {
      await platformClient.DELETE("/api/v1/platform/quality/datasets/{id}/items/{itemId}", {
        params: { path: { id, itemId } },
      });
    },
    onSuccess: (_result, { id }) => {
      void queryClient.invalidateQueries({ queryKey: platformKeys.quality.datasets.detail(id) });
      void queryClient.invalidateQueries({ queryKey: platformKeys.quality.datasets.items(id) });
    },
  });
}
