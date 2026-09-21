"use client";

/**
 * Voz de un tenant desde la consola (gobierno de la voz, 2026-09-21).
 * Lectura `GET /platform/tenants/:id/voice`; escrituras `PUT …/voice/settings`
 * (interruptor), `PUT …/voice/credential` (llave, write-only) y
 * `DELETE …/voice/credential`. Las tres van `@Audited` en el backend y exigen
 * super_admin. Toda mutación invalida la lectura: la pestaña se repinta con lo
 * que el servidor dice, no con lo que el formulario cree.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export function useTenantVoiceQuery(id: string) {
  return useQuery({
    queryKey: platformKeys.tenants.voice(id),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/tenants/{id}/voice", {
        params: { path: { id } },
      });
      return data!;
    },
    staleTime: 30_000,
  });
}

function useInvalidateVoice(id: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: platformKeys.tenants.voice(id) });
}

export function useSetTenantVoiceEnabled(id: string) {
  const invalidate = useInvalidateVoice(id);
  return useMutation({
    mutationFn: async (ai_enabled: boolean) => {
      await platformClient.PUT("/api/v1/platform/tenants/{id}/voice/settings", {
        params: { path: { id } },
        body: { ai_enabled },
      });
    },
    onSuccess: invalidate,
  });
}

export function useSetTenantVoiceCredential(id: string) {
  const invalidate = useInvalidateVoice(id);
  return useMutation({
    mutationFn: async (api_key: string) => {
      await platformClient.PUT("/api/v1/platform/tenants/{id}/voice/credential", {
        params: { path: { id } },
        body: { api_key },
      });
    },
    onSuccess: invalidate,
  });
}

export function useRemoveTenantVoiceCredential(id: string) {
  const invalidate = useInvalidateVoice(id);
  return useMutation({
    mutationFn: async () => {
      await platformClient.DELETE("/api/v1/platform/tenants/{id}/voice/credential", {
        params: { path: { id } },
      });
    },
    onSuccess: invalidate,
  });
}
