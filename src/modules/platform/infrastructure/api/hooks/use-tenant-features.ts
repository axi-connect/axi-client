"use client";

/**
 * Funciones de un tenant desde la consola (F1 del programa Cobros).
 * Lectura `GET /platform/tenants/:id/features`; escritura del override
 * `PUT /platform/tenants/:id/features/:code` (`forced: 'on'|'off'|null`,
 * `null` = heredar). Ambas van `@Audited` en el backend.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export function useTenantFeaturesQuery(id: string) {
  return useQuery({
    queryKey: platformKeys.tenants.features(id),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/tenants/{id}/features", {
        params: { path: { id } },
      });
      return data!;
    },
    staleTime: 30_000,
  });
}

export function useSetTenantFeatureOverride(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ code, forced, reason }: { code: string; forced: "on" | "off" | null; reason?: string }) => {
      const { data } = await platformClient.PUT("/api/v1/platform/tenants/{id}/features/{code}", {
        params: { path: { id, code } },
        body: { forced, ...(reason === undefined ? {} : { reason }) },
      });
      return data!;
    },
    // La respuesta trae la lista ya resuelta, pero se invalida igual: una
    // función puede arrastrar a otra y el caché de la consola debe reflejarlo.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.tenants.features(id) }),
  });
}
