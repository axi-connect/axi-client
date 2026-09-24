"use client";

/**
 * Hooks del simulacro interactivo (upgrade quality F1).
 *
 * El detalle se pollea con `sessionPollInterval` (1,5 s mientras el agente
 * «escribe», 4 s quieta, apagado terminada / re-login / pestaña oculta) y
 * pide solo el DELTA del transcript (`?after=<último id>`), que se fusiona en
 * caché: la respuesta del pipeline llega sin recargar la conversación entera
 * ni volver a presignar adjuntos. La traza se refresca cuando crece el
 * transcript (cada respuesta del agente trae un turno nuevo).
 *
 * El envío es optimista: la burbuja del operador aparece al instante con el
 * `provider_message_id` que devuelve el 202 y se reconcilia cuando el mensaje
 * persistido llega por el polling.
 */
import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  isOptimisticMessage,
  lastMessageId,
  mergeTranscript,
  OPTIMISTIC_ID_PREFIX,
  type CreateSessionDTO,
  type SendSessionMessageDTO,
  type SessionDetail,
  type SessionMessage,
} from "../../../domain/quality-sessions";
import { sessionPollInterval } from "../../../domain/polling";
import { usePlatformAuth } from "../../auth/platform-auth.context";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export type SessionsFilters = {
  companyId?: string;
  status?: "active" | "ended";
  mine?: boolean;
  page: number;
  pageSize: number;
};

export function useSessionsQuery(filters: SessionsFilters) {
  const { reloginOpen } = usePlatformAuth();
  return useQuery({
    queryKey: platformKeys.quality.sessions.list({
      company_id: filters.companyId ?? null,
      status: filters.status ?? null,
      mine: filters.mine ?? null,
      page: filters.page,
      page_size: filters.pageSize,
    }),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/quality/sessions", {
        params: {
          query: {
            ...(filters.companyId ? { company_id: filters.companyId } : {}),
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.mine ? { mine: "true" as const } : {}),
            page: filters.page,
            page_size: filters.pageSize,
          },
        },
      });
      return data!;
    },
    staleTime: 3_000,
    placeholderData: keepPreviousData,
    // La lista respira mientras haya alguna sesión activa (gasto y estado)
    refetchInterval: (query) => {
      if (reloginOpen) return false;
      const rows = query.state.data?.data ?? [];
      return rows.some((session) => session.status === "active") ? 5_000 : false;
    },
  });
}

/** `document.hidden` como estado React para apagar el polling en segundo plano. */
function usePageHidden(): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const update = () => setHidden(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return hidden;
}

export function useSessionQuery(id: string) {
  const { reloginOpen } = usePlatformAuth();
  const hidden = usePageHidden();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: platformKeys.quality.sessions.detail(id),
    queryFn: async (): Promise<SessionDetail> => {
      const known = queryClient.getQueryData<SessionDetail>(platformKeys.quality.sessions.detail(id));
      const after = known ? lastMessageId(known.transcript) : undefined;
      const { data } = await platformClient.GET("/api/v1/platform/quality/sessions/{id}", {
        params: { path: { id }, query: after ? { after } : {} },
      });
      const fresh = data!;
      if (fresh.transcript_mode === "delta" && known) {
        return { ...fresh, transcript: mergeTranscript(known.transcript, fresh.transcript) };
      }
      return fresh;
    },
    staleTime: 1_000,
    refetchInterval: (query) =>
      sessionPollInterval({
        status: query.state.data?.status,
        agentState: query.state.data?.agent_state,
        reloginOpen,
        hidden,
      }),
  });
}

/** Traza del turno: se vuelve a leer cuando cambia el número de mensajes. */
export function useSessionTraceQuery(id: string, transcriptLength: number) {
  return useQuery({
    queryKey: [...platformKeys.quality.sessions.trace(id), transcriptLength],
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/quality/sessions/{id}/trace", {
        params: { path: { id } },
      });
      return data!;
    },
    placeholderData: keepPreviousData,
    staleTime: 5_000,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateSessionDTO) => {
      const { data } = await platformClient.POST("/api/v1/platform/quality/sessions", { body });
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.quality.sessions.all }),
  });
}

/**
 * Envío optimista: la burbuja del operador se pinta al instante con estado
 * `queued`; el polling la reemplaza por la persistida (mismo
 * provider_message_id) y trae la respuesta del agente.
 */
export function useSendSessionMessage(id: string) {
  const queryClient = useQueryClient();
  const key = platformKeys.quality.sessions.detail(id);
  return useMutation({
    mutationFn: async (body: SendSessionMessageDTO) => {
      const { data } = await platformClient.POST("/api/v1/platform/quality/sessions/{id}/messages", {
        params: { path: { id } },
        body,
      });
      return { accepted: data!, body };
    },
    onSuccess: ({ accepted, body }) => {
      queryClient.setQueryData<SessionDetail>(key, (known) => {
        if (!known) return known;
        const optimistic: SessionMessage = {
          // El id definitivo llega con el polling; uno provisional ordena al final
          id: `${OPTIMISTIC_ID_PREFIX}${accepted.provider_message_id}`,
          direction: "inbound",
          sender_type: "contact",
          agent_id: null,
          content_type: body.kind === "tap" ? "interactive" : body.kind === "location" ? "location" : "text",
          body: body.kind === "tap" ? (body.title ?? null) : body.kind === "text" ? (body.body ?? null) : null,
          provider_message_id: accepted.provider_message_id,
          status: "queued",
          created_at: new Date().toISOString(),
          interactive: null,
          interactive_reply:
            body.kind === "tap" && body.option_id && body.title
              ? { id: body.option_id, title: body.title, source: body.source ?? "button" }
              : null,
          location: body.kind === "location" && body.location ? body.location : null,
        };
        return { ...known, agent_state: "thinking", transcript: [...known.transcript, optimistic] };
      });
    },
    onError: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

/** Reconcilia las burbujas optimistas con las persistidas (mismo provider_message_id). */
export function dedupeOptimistic(transcript: readonly SessionMessage[]): SessionMessage[] {
  const persisted = new Set(
    transcript.filter((message) => !isOptimisticMessage(message)).map((message) => message.provider_message_id),
  );
  return transcript.filter(
    (message) => !isOptimisticMessage(message) || !persisted.has(message.provider_message_id),
  );
}

export function useEndSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await platformClient.POST("/api/v1/platform/quality/sessions/{id}/end", {
        params: { path: { id } },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.quality.sessions.all }),
  });
}
