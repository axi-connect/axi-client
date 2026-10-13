"use client";

/**
 * Hooks del control de almacenamiento en platform. Las mutaciones invalidan
 * tras el 2xx (sin optimismo): una cuota o una depuración cambian cifras que
 * calcula el servidor.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  PurgeFilter,
  PurgeKind,
  PurgePreview,
  RetentionRule,
  SetStorageQuotaBody,
} from "../../../domain/storage";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export type StorageTenantsParams = {
  q?: string;
  state?: "ok" | "warning" | "full" | "unlimited";
  sort: "pct_desc" | "used_desc" | "growth_desc" | "name_asc";
  page: number;
  page_size: number;
};

export function useStorageOverview() {
  return useQuery({
    queryKey: platformKeys.storage.overview(),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/storage/overview");
      return data!;
    },
    staleTime: 60_000,
  });
}

export function useStorageTenants(params: StorageTenantsParams) {
  return useQuery({
    queryKey: platformKeys.storage.tenants(params),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/storage/tenants", {
        params: { query: params },
      });
      return data!;
    },
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useTenantStorage(tenantId: string) {
  return useQuery({
    queryKey: platformKeys.storage.tenant(tenantId),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/storage/tenants/{id}", {
        params: { path: { id: tenantId } },
      });
      return data!;
    },
    staleTime: 30_000,
  });
}

export function usePurgeOptions(tenantId: string) {
  return useQuery({
    queryKey: platformKeys.storage.purgeOptions(tenantId),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/storage/tenants/{id}/purge-options", {
        params: { path: { id: tenantId } },
      });
      return data!.data;
    },
    staleTime: 30_000,
  });
}

export function useLargeFiles(
  tenantId: string,
  params: { category?: string; older_than_days?: number; limit: number; offset: number },
  enabled = true,
) {
  return useQuery({
    queryKey: platformKeys.storage.files(tenantId, params),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/storage/tenants/{id}/files", {
        params: { path: { id: tenantId }, query: params as never },
      });
      return data!.data;
    },
    enabled,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

export function useRetentionPolicies(tenantId: string) {
  return useQuery({
    queryKey: platformKeys.storage.retention(tenantId),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/storage/tenants/{id}/retention-policies", {
        params: { path: { id: tenantId } },
      });
      return data!;
    },
    staleTime: 60_000,
  });
}

export function usePurgeRuns(tenantId: string) {
  return useQuery({
    queryKey: platformKeys.storage.runs(tenantId),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/storage/purge-runs", {
        params: { query: { company_id: tenantId } },
      });
      return data!.data;
    },
    staleTime: 15_000,
  });
}

/** El avance de una depuración en curso: se consulta cada 2 s hasta que termina. */
export function usePurgeRun(runId: string | null) {
  return useQuery({
    queryKey: platformKeys.storage.run(runId ?? "none"),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/storage/purge-runs/{id}", {
        params: { path: { id: runId as string } },
      });
      return data!;
    },
    enabled: runId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "done" || status === "partial" || status === "failed" ? false : 2_000;
    },
  });
}

function invalidateTenant(queryClient: ReturnType<typeof useQueryClient>, tenantId: string) {
  void queryClient.invalidateQueries({ queryKey: platformKeys.storage.tenant(tenantId) });
  void queryClient.invalidateQueries({ queryKey: platformKeys.storage.overview() });
  void queryClient.invalidateQueries({ queryKey: ["platform", "storage", "tenants"] });
}

export function useSetStorageQuota(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: SetStorageQuotaBody) => {
      await platformClient.PUT("/api/v1/platform/storage/tenants/{id}/quota", {
        params: { path: { id: tenantId } },
        body,
      });
    },
    onSuccess: () => invalidateTenant(queryClient, tenantId),
  });
}

export function usePurgePreview(tenantId: string) {
  return useMutation({
    mutationFn: async (body: { kind: PurgeKind; filter: PurgeFilter }): Promise<PurgePreview> => {
      const { data } = await platformClient.POST("/api/v1/platform/storage/tenants/{id}/purge-previews", {
        params: { path: { id: tenantId } },
        body,
      });
      return data!;
    },
  });
}

export function useExecutePurge(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { preview_id: string; confirm_phrase: string; password: string }) => {
      await platformClient.POST("/api/v1/platform/storage/purge-previews/{id}/execute", {
        params: { path: { id: input.preview_id } },
        body: { confirm_phrase: input.confirm_phrase, password: input.password },
      });
      return input.preview_id;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: platformKeys.storage.runs(tenantId) }),
  });
}

/** Al terminar una depuración, todo lo del tenant se vuelve a leer. */
export function useRefreshTenantStorage(tenantId: string) {
  const queryClient = useQueryClient();
  return () => {
    invalidateTenant(queryClient, tenantId);
    void queryClient.invalidateQueries({ queryKey: platformKeys.storage.purgeOptions(tenantId) });
    void queryClient.invalidateQueries({ queryKey: ["platform", "storage", "tenant", tenantId, "files"] });
    void queryClient.invalidateQueries({ queryKey: platformKeys.storage.runs(tenantId) });
  };
}

export function useReplaceRetention(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (policies: (RetentionRule & { enabled: boolean })[]) => {
      await platformClient.PUT("/api/v1/platform/storage/tenants/{id}/retention-policies", {
        params: { path: { id: tenantId } },
        body: { policies },
      });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: platformKeys.storage.retention(tenantId) }),
  });
}
