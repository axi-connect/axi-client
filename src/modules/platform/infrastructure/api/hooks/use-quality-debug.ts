"use client";

/**
 * Hooks del depurador forense de conversaciones. Flujo encadenado por
 * `enabled`: tenant → contactos (búsqueda server) → conversaciones. Las
 * respuestas son `{data}` SIN meta, con cap fijo de 25 filas y sin
 * paginación (la UI lo dice: "refina la búsqueda"). El directorio MUESTRA
 * los `simulated` a propósito (herramienta forense) y todo acceso queda
 * AUDITADO en el backend.
 */
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export function useDebugContactsQuery(companyId: string | null, search: string) {
  const trimmed = search.trim();
  return useQuery({
    queryKey: platformKeys.quality.debug.contacts(companyId ?? "none", trimmed),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/quality/debug/{companyId}/contacts", {
        params: {
          path: { companyId: companyId! },
          query: trimmed ? { search: trimmed } : {},
        },
      });
      return data!;
    },
    enabled: companyId !== null,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useDebugConversationsQuery(companyId: string | null, contactId: string | null) {
  return useQuery({
    queryKey: platformKeys.quality.debug.conversations(companyId ?? "none", contactId ?? "none"),
    queryFn: async () => {
      const { data } = await platformClient.GET(
        "/api/v1/platform/quality/debug/{companyId}/contacts/{contactId}/conversations",
        { params: { path: { companyId: companyId!, contactId: contactId! } } },
      );
      return data!;
    },
    enabled: companyId !== null && contactId !== null,
    staleTime: 30_000,
  });
}
