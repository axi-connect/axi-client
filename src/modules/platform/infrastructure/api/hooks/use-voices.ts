"use client";

/**
 * Hooks de la curaduría de voces (§10.5). Todas las mutaciones invalidan la
 * lista (sin optimistic — D9): el orden y las URLs presignadas de las muestras
 * salen SIEMPRE frescas del servidor.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateVoiceDTO, UpdateVoiceDTO } from "../../../domain/voices";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export function useVoicesQuery() {
  return useQuery({
    queryKey: platformKeys.voices.list(),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/ai-voices");
      return data!;
    },
    staleTime: 60_000,
  });
}

export function useCreateVoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateVoiceDTO) => {
      const { data } = await platformClient.POST("/api/v1/platform/ai-voices", { body });
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.voices.all }),
  });
}

export function useUpdateVoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateVoiceDTO }) => {
      await platformClient.PATCH("/api/v1/platform/ai-voices/{id}", {
        params: { path: { id } },
        body,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.voices.all }),
  });
}

export function useSetVoiceActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await platformClient.PATCH("/api/v1/platform/ai-voices/{id}/active", {
        params: { path: { id } },
        body: { is_active },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.voices.all }),
  });
}

/** Replace-set: `ids` es el catálogo COMPLETO en el orden final. */
export function useReorderVoices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await platformClient.PUT("/api/v1/platform/ai-voices/order", { body: { ids } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.voices.all }),
  });
}

/** Sintetiza la muestra con la cuenta de axi (síncrono, ~1 s). `text`
 * opcional: el backend cae a la frase guardada de la voz o a la de marca. */
export function useGeneratePreview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, text }: { id: string; text?: string }) => {
      const { data } = await platformClient.POST("/api/v1/platform/ai-voices/{id}/preview", {
        params: { path: { id } },
        body: text === undefined ? {} : { text },
      });
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.voices.all }),
  });
}
