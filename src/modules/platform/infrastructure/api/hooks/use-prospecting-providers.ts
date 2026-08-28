"use client";

/**
 * Proveedores externos de la captación de leads (prospecting F3).
 *
 * Lo que este panel administra son LLAVES: las de MillionVerifier, Twilio,
 * Apollo. Dos consecuencias en el código de esta capa:
 *
 * 1. **Ninguna respuesta trae una llave.** El backend devuelve `token_last4` y
 *    nada más, así que no hay nada que ocultar en el cliente — pero tampoco se
 *    cachea el formulario de alta ni se re-envía lo que se escribió.
 * 2. **El alta puede tardar**: la credencial se valida contra el proveedor
 *    ANTES de guardarla, así que el botón tiene que reflejar que está esperando
 *    una respuesta de un tercero.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { usePlatformAuth } from "../../auth/platform-auth.context";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";
import type {
  ProviderAccount,
  ProviderCatalogEntry,
  ProviderCredentials,
} from "../../../domain/prospecting-providers";

export function useProviderCatalogQuery() {
  const { reloginOpen } = usePlatformAuth();
  return useQuery({
    queryKey: platformKeys.prospecting.catalog(),
    queryFn: async () => {
      const { data } = await platformClient.GET(
        "/api/v1/platform/prospecting/catalog",
      );
      return (data?.data ?? []) as ProviderCatalogEntry[];
    },
    // El catálogo es el código: no cambia hasta el próximo despliegue.
    staleTime: Number.POSITIVE_INFINITY,
    enabled: !reloginOpen,
  });
}

export function useProviderAccountsQuery() {
  const { reloginOpen } = usePlatformAuth();
  return useQuery({
    queryKey: platformKeys.prospecting.providers(),
    queryFn: async () => {
      const { data } = await platformClient.GET(
        "/api/v1/platform/prospecting/providers",
      );
      return (data ?? []) as unknown as ProviderAccount[];
    },
    // Saldo y gasto cambian solos: se refresca al volver a la pestaña.
    refetchOnWindowFocus: true,
    enabled: !reloginOpen,
  });
}

export function useCreateProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      provider: ProviderCatalogEntry["provider"];
      label: string;
      credentials: ProviderCredentials;
      priority?: number;
      daily_cap?: number;
    }) => {
      const { data } = await platformClient.POST(
        "/api/v1/platform/prospecting/providers",
        {
          body: input as never,
        },
      );
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: platformKeys.prospecting.providers(),
      }),
  });
}

export function useRotateCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      credentials: ProviderCredentials;
    }) => {
      await platformClient.PUT(
        "/api/v1/platform/prospecting/providers/{id}/credentials",
        {
          params: { path: { id: input.id } },
          body: { credentials: input.credentials } as never,
        },
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: platformKeys.prospecting.providers(),
      }),
  });
}

export function useUpdateProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      enabled?: boolean;
      priority?: number;
      daily_cap?: number | null;
    }) => {
      const { id, ...patch } = input;
      await platformClient.PATCH(
        "/api/v1/platform/prospecting/providers/{id}",
        {
          params: { path: { id } },
          body: patch as never,
        },
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: platformKeys.prospecting.providers(),
      }),
  });
}

export function useProbeProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await platformClient.POST(
        "/api/v1/platform/prospecting/providers/{id}/health",
        { params: { path: { id } } },
      );
      return data;
    },
    // La sonda persiste el estado de salud en el backend, así que la lista
    // tiene que recargarse: es lo que decide si el proveedor sigue en la
    // cascada.
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: platformKeys.prospecting.providers(),
      }),
  });
}
