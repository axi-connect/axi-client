"use client";

/**
 * Hooks de la puesta en marcha conversacional (TanStack Query + platformClient).
 *
 * Política del panel: lecturas con `staleTime`, mutaciones sin optimistic —
 * aquí con más razón que en ningún otro recurso, porque aplicar una entrevista
 * ESCRIBE en la configuración de una empresa real y adelantar el resultado en
 * la pantalla antes de saberlo sería mentir sobre algo que importa.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export function useIntakeBlueprintsQuery(includeInactive = false) {
  return useQuery({
    queryKey: [...platformKeys.intake.blueprints(), includeInactive],
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/intake/blueprints", {
        params: { query: includeInactive ? { include_inactive: "true" } : {} },
      });
      return data!;
    },
    staleTime: 60_000,
  });
}

export function useIntakeSessionsQuery(filters: { status?: string; company_id?: string }) {
  return useQuery({
    queryKey: platformKeys.intake.sessions(filters),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/intake/sessions", {
        params: { query: filters as never },
      });
      return data!;
    },
    // Corto: la consola se mira mientras alguien está contestando al otro lado.
    staleTime: 20_000,
  });
}

export function useIntakeSessionQuery(id: string | null) {
  return useQuery({
    queryKey: platformKeys.intake.session(id ?? ""),
    enabled: id !== null,
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/intake/sessions/{id}", {
        params: { path: { id: id! } },
      });
      return data!;
    },
    staleTime: 15_000,
  });
}

/**
 * Qué pasaría si se aplicara. **No escribe nada**: es un GET, y por eso se
 * puede pedir al abrir la ficha sin preguntar nada a nadie.
 */
export function useIntakeApplyPlanQuery(id: string | null, enabled: boolean) {
  return useQuery({
    queryKey: platformKeys.intake.applyPlan(id ?? ""),
    enabled: id !== null && enabled,
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/intake/sessions/{id}/apply", {
        params: { path: { id: id! } },
      });
      return data!;
    },
    staleTime: 0,
  });
}

export function useCreateIntakeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      blueprint_id: string;
      company_id: string;
      invite_name?: string | null;
      invite_email?: string | null;
      invite_phone?: string | null;
      source_url?: string | null;
    }) => {
      const { data } = await platformClient.POST("/api/v1/platform/intake/sessions", {
        body: body as never,
      });
      return data!;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: platformKeys.intake.all });
    },
  });
}

/**
 * Reemitir el enlace. **Invalida el anterior**: en la base vive solo el hash,
 * así que rotar es la única forma de cortar un enlace que se reenvió a quien no
 * debía — y también la de revivir uno caducado.
 */
export function useReissueIntakeLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await platformClient.POST(
        "/api/v1/platform/intake/sessions/{id}/link",
        { params: { path: { id } } },
      );
      return data!;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: platformKeys.intake.all });
    },
  });
}

export function useCancelIntakeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await platformClient.POST("/api/v1/platform/intake/sessions/{id}/cancel", {
        params: { path: { id } },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: platformKeys.intake.all });
    },
  });
}

/**
 * Aplicar. Lleva la huella del plan que se aprobó en el preview: si entre
 * medias la persona siguió contestando o corrigió la ficha, el servidor
 * responde 409 `intake/plan_changed` y la consola recarga el antes/después.
 * Lo que se aprueba tiene que ser exactamente lo que se escribe.
 */
export function useApplyIntakeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, plan_hash }: { id: string; plan_hash: string }) => {
      const { data } = await platformClient.POST(
        "/api/v1/platform/intake/sessions/{id}/apply",
        { params: { path: { id } }, body: { plan_hash } },
      );
      return data!;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: platformKeys.intake.all });
    },
  });
}
