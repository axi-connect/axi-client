"use client";

/**
 * Hooks de ejecuciones de calidad (terminología de UI: "ejecución", nunca
 * "corrida"). Lista con paginación server + keepPreviousData y refresco de
 * 3 s si hay alguna ejecución activa en la página (pausado con re-login).
 * `useCreateRun` devuelve 202 `{id}` — aceptado, no terminado: el
 * seguimiento fino por ejecución llega en F4 (`useRunQuery` + polling).
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isRunActive, type CreateRunDTO, type RunKind, type RunStatus } from "../../../domain/quality-runs";
import { casePollInterval, RUN_POLL_MS, runPollInterval } from "../../../domain/polling";
import { usePlatformAuth } from "../../auth/platform-auth.context";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";

export type RunsFilters = {
  companyId?: string;
  kind?: RunKind;
  status?: RunStatus;
  page: number;
  pageSize: number;
};

export function useRunsQuery(filters: RunsFilters) {
  const { reloginOpen } = usePlatformAuth();

  return useQuery({
    queryKey: platformKeys.quality.runs.list({
      company_id: filters.companyId ?? null,
      kind: filters.kind ?? null,
      status: filters.status ?? null,
      page: filters.page,
      page_size: filters.pageSize,
    }),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/quality/runs", {
        params: {
          query: {
            ...(filters.companyId ? { company_id: filters.companyId } : {}),
            ...(filters.kind ? { kind: filters.kind } : {}),
            ...(filters.status ? { status: filters.status } : {}),
            page: filters.page,
            page_size: filters.pageSize,
          },
        },
      });
      return data!;
    },
    staleTime: 3_000,
    placeholderData: keepPreviousData,
    // La lista respira sola mientras alguna ejecución de la página siga viva.
    refetchInterval: (query) => {
      if (reloginOpen) return false;
      const rows = query.state.data?.data ?? [];
      return rows.some((run) => isRunActive(run.status)) ? RUN_POLL_MS : false;
    },
  });
}

/**
 * Detalle en vivo de una ejecución: polling de 3 s mientras siga en vuelo
 * (`pending|running|purging`), pausado con el ReLoginModal abierto. Incluye
 * `cases[]` COMPLETO (sin paginar, ≤200 — el backend no lo pagina).
 */
export function useRunQuery(id: string) {
  const { reloginOpen } = usePlatformAuth();

  return useQuery({
    queryKey: platformKeys.quality.runs.detail(id),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/quality/runs/{id}", {
        params: { path: { id } },
      });
      return data!;
    },
    staleTime: 3_000,
    refetchInterval: (query) =>
      runPollInterval({ status: query.state.data?.status, reloginOpen }),
  });
}

/**
 * Detalle de un case: polling mientras no esté asentado (queued|running).
 * NO se pollea el run entero desde la vista de case (el case trae todo).
 */
export function useRunCaseQuery(runId: string, caseId: string) {
  const { reloginOpen } = usePlatformAuth();

  return useQuery({
    queryKey: platformKeys.quality.runs.case(runId, caseId),
    queryFn: async () => {
      const { data } = await platformClient.GET(
        "/api/v1/platform/quality/runs/{id}/cases/{caseId}",
        { params: { path: { id: runId, caseId } } },
      );
      return data!;
    },
    staleTime: 3_000,
    refetchInterval: (query) =>
      casePollInterval({ status: query.state.data?.status, reloginOpen }),
  });
}

/** POST → 202 {id}: la ejecución queda encolada (pending) y arranca sola. */
export function useCreateRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateRunDTO) => {
      const { data } = await platformClient.POST("/api/v1/platform/quality/runs", { body });
      return data!;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.quality.runs.all }),
  });
}

/** Solo desde pending|running; si no, 409 quality/run_not_cancelable. */
export function useCancelRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await platformClient.POST("/api/v1/platform/quality/runs/{id}/cancel", {
        params: { path: { id } },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.quality.runs.all }),
  });
}

/**
 * Purga los datos sintéticos del tenant (202 → purging → purged; borrado
 * por lotes en cola, idempotente). Solo desde terminales; si no, 409
 * `quality/run_not_purgeable`. Tras purgar, transcript y evaluación de los
 * cases dejan de estar disponibles.
 */
export function usePurgeRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await platformClient.POST("/api/v1/platform/quality/runs/{id}/purge", {
        params: { path: { id } },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.quality.runs.all }),
  });
}
