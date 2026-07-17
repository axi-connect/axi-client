"use client";

/**
 * Hooks de la migración de datos SBS→Enterprise (últimas 20 del tenant).
 * Poll de 5 s SOLO mientras la más reciente esté en vuelo (función pura
 * `migrationPollInterval`), pausado con el ReLoginModal abierto.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DataMigration } from "../../../domain/database";
import { migrationPollInterval } from "../../../domain/polling";
import { usePlatformAuth } from "../../auth/platform-auth.context";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

/** La migración más reciente (el backend lista las últimas 20; se ordena por robustez). */
export function latestMigration(migrations: DataMigration[] | undefined): DataMigration | null {
  if (!migrations || migrations.length === 0) return null;
  return [...migrations].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}

export function useMigrationsQuery(tenantId: string) {
  const { reloginOpen } = usePlatformAuth();

  return useQuery({
    queryKey: platformKeys.tenants.migrations(tenantId),
    queryFn: async () => {
      const { data } = await platformClient.GET(
        "/api/v1/platform/tenants/{id}/database/migrations",
        { params: { path: { id: tenantId } } },
      );
      return data!;
    },
    staleTime: 5_000,
    refetchInterval: (current) => {
      const status = latestMigration(current.state.data?.data)?.status ?? null;
      return migrationPollInterval({ status, reloginOpen });
    },
  });
}

export function useStartDataMigration(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await platformClient.POST(
        "/api/v1/platform/tenants/{id}/database/migrate-data",
        { params: { path: { id: tenantId } } },
      );
      return data!;
    },
    onSuccess: () => {
      // 202: el poll de migraciones arranca al ver la nueva en vuelo; el
      // cutover también mueve el estado de la DB y del tenant (suspendido).
      void queryClient.invalidateQueries({ queryKey: platformKeys.tenants.migrations(tenantId) });
      void queryClient.invalidateQueries({ queryKey: platformKeys.tenants.database(tenantId) });
    },
  });
}
