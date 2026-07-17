"use client";

/**
 * Hooks de la base de datos dedicada del tenant.
 * - El GET captura el 404 `tenant_db/not_found` → `data: null` = "sin
 *   configurar" (empty state, NO error — spec §3.4).
 * - Polling condicional vía `databasePollInterval` (función pura): 3 s en
 *   transitorio, 15 s pasados 10 min, `false` en estados asentados y con el
 *   ReLoginModal abierto. Un solo timer de TanStack, cero requests de más.
 * - Mutaciones 202/204 → invalidación DIRIGIDA de `tenants.database(id)`.
 */
import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isHttpError } from "@/core/api/problem";
import type { TenantDatabaseView, UpsertTenantDatabaseDTO } from "../../../domain/database";
import { databasePollInterval, DB_POLL_DEGRADE_AFTER_MS } from "../../../domain/polling";
import { usePlatformAuth } from "../../auth/platform-auth.context";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export function useTenantDatabaseQuery(tenantId: string) {
  const { reloginOpen } = usePlatformAuth();
  // Momento en que el status entró en transitorio (para degradar el poll).
  const pollStartRef = useRef<number | null>(null);

  const query = useQuery<TenantDatabaseView | null>({
    queryKey: platformKeys.tenants.database(tenantId),
    queryFn: async () => {
      try {
        const { data } = await platformClient.GET("/api/v1/platform/tenants/{id}/database", {
          params: { path: { id: tenantId } },
        });
        return data!;
      } catch (error) {
        // 404 = sin base dedicada configurada: estado válido, no error.
        if (isHttpError(error) && error.status === 404) return null;
        throw error;
      }
    },
    staleTime: 5_000,
    refetchInterval: (current) => {
      const status = current.state.data?.status ?? null;
      const transitional = status === "validating" || status === "migrating";
      if (transitional && pollStartRef.current === null) pollStartRef.current = Date.now();
      if (!transitional) pollStartRef.current = null;
      return databasePollInterval({ status, pollStartedAt: pollStartRef.current, reloginOpen });
    },
  });

  // Aviso "sigue en curso" cuando el intervalo ya degradó a 15 s.
  const pollDegraded =
    pollStartRef.current !== null && Date.now() - pollStartRef.current >= DB_POLL_DEGRADE_AFTER_MS;

  return { ...query, pollDegraded };
}

function useInvalidateDatabase(tenantId: string) {
  const queryClient = useQueryClient();
  return () =>
    void queryClient.invalidateQueries({ queryKey: platformKeys.tenants.database(tenantId) });
}

export function useUpsertTenantDatabase(tenantId: string) {
  const invalidate = useInvalidateDatabase(tenantId);
  return useMutation({
    mutationFn: async (body: UpsertTenantDatabaseDTO) => {
      await platformClient.PUT("/api/v1/platform/tenants/{id}/database", {
        params: { path: { id: tenantId } },
        body,
      });
    },
    onSuccess: invalidate,
  });
}

/** Validación SÍNCRONA (200 con checklist); el resultado vive en `mutation.data`. */
export function useValidateDatabase(tenantId: string) {
  const invalidate = useInvalidateDatabase(tenantId);
  return useMutation({
    mutationFn: async () => {
      const { data } = await platformClient.POST(
        "/api/v1/platform/tenants/{id}/database/validate",
        { params: { path: { id: tenantId } } },
      );
      return data!;
    },
    // last_validated_at (y posible status) cambian en el server.
    onSettled: invalidate,
  });
}

export function useProvisionDatabase(tenantId: string) {
  const invalidate = useInvalidateDatabase(tenantId);
  return useMutation({
    mutationFn: async () => {
      const { data } = await platformClient.POST(
        "/api/v1/platform/tenants/{id}/database/provision",
        { params: { path: { id: tenantId } } },
      );
      return data!;
    },
    // 202: el re-fetch trae el status transitorio y el poll arranca solo.
    onSuccess: invalidate,
  });
}

export function useDisableDatabase(tenantId: string) {
  const invalidate = useInvalidateDatabase(tenantId);
  return useMutation({
    mutationFn: async () => {
      await platformClient.POST("/api/v1/platform/tenants/{id}/database/disable", {
        params: { path: { id: tenantId } },
      });
    },
    onSuccess: invalidate,
  });
}
