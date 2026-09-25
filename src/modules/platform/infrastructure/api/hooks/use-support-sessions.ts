"use client";

/**
 * Acceso de soporte desde la consola (entrega F3): emitir una sesión, el
 * registro del tenant, cerrarla y exportarlo en CSV.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { IssueSupportSessionDTO } from "../../../domain/support-sessions";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export function useSupportSessionsQuery(tenantId: string) {
  return useQuery({
    queryKey: platformKeys.tenants.supportSessions(tenantId),
    queryFn: async ({ signal }) => {
      const { data } = await platformClient.GET("/api/v1/platform/tenants/{id}/support-sessions", {
        params: { path: { id: tenantId } },
        signal,
      });
      return data!;
    },
    // Sin tenant (vista global de auditoría) no hay registro que pedir.
    enabled: tenantId !== "",
    staleTime: 30_000,
  });
}

/** Emite la sesión: devuelve el código de traspaso (60 s, un solo uso). */
export function useIssueSupportSession(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: IssueSupportSessionDTO) => {
      const { data } = await platformClient.POST("/api/v1/platform/tenants/{id}/support-sessions", {
        params: { path: { id: tenantId } },
        body,
      });
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.tenants.supportSessions(tenantId) }),
  });
}

export function useRevokeSupportSession(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await platformClient.DELETE("/api/v1/platform/support-sessions/{id}", {
        params: { path: { id: sessionId } },
      });
      return data!;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: platformKeys.tenants.supportSessions(tenantId) }),
  });
}

/** El CSV del registro, como Blob (lo descarga la UI). */
export async function exportSupportSessionsCsv(tenantId: string): Promise<Blob> {
  const { data } = await platformClient.GET("/api/v1/platform/tenants/{id}/support-sessions/export", {
    params: { path: { id: tenantId } },
    parseAs: "blob",
  });
  return data as unknown as Blob;
}
