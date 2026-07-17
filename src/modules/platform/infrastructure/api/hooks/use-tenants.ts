"use client";

/**
 * Hooks de datos del recurso tenants (TanStack Query + platformClient).
 * Política: lecturas con staleTime (listas 60 s); mutaciones 204/201 →
 * `invalidateQueries` del recurso (nunca optimistic — spec D9).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateTenantDTO, TenantListItem, UpdateTenantDTO } from "../../../domain/tenant";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

async function fetchTenants() {
  const { data } = await platformClient.GET("/api/v1/platform/tenants");
  // El middleware lanza HttpError en !ok; aquí `data` siempre existe.
  return data!;
}

export function useTenantsQuery() {
  return useQuery({
    queryKey: platformKeys.tenants.list(),
    queryFn: fetchTenants,
    staleTime: 60_000,
  });
}

/**
 * Detalle de un tenant derivado de la caché de la lista (no hay GET by id).
 * `undefined` = cargando · `null` = no existe en la lista.
 */
export function useTenantQuery(id: string) {
  return useQuery({
    queryKey: platformKeys.tenants.list(),
    queryFn: fetchTenants,
    staleTime: 60_000,
    select: (payload): TenantListItem | null =>
      payload.data.find((tenant) => tenant.id === id) ?? null,
  });
}

export function useTenantUsersQuery(id: string) {
  return useQuery({
    queryKey: platformKeys.tenants.users(id),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/tenants/{id}/users", {
        params: { path: { id } },
      });
      return data!;
    },
    staleTime: 30_000,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateTenantDTO) => {
      const { data } = await platformClient.POST("/api/v1/platform/tenants", { body });
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.tenants.all }),
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateTenantDTO }) => {
      await platformClient.PATCH("/api/v1/platform/tenants/{id}", {
        params: { path: { id } },
        body,
      });
    },
    // 204 sin body → re-fetch del recurso para reflejar el cambio real.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.tenants.all }),
  });
}
