"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { usePlatformAuth } from "../../auth/platform-auth.context";
import { platformClient } from "../platform-client";
import { platformKeys } from "../query-keys";
import type {
  AvailableNumber,
  CallAccount,
  CallCredentials,
  CallNumber,
  OwnedTwilioNumber,
  TenantCallAgent,
  OwnedCallerId,
} from "../../../domain/call-provisioning";

/** Hooks del aprovisionamiento de telefonía (calls F4-E). Mismo reparto que
 * prospecting: queries con `enabled: !reloginOpen`, mutaciones que solo
 * invalidan (cero optimistic updates). */

export function useCallAccountsQuery() {
  const { reloginOpen } = usePlatformAuth();
  return useQuery({
    queryKey: platformKeys.calls.accounts(),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/calls/providers");
      return (data ?? []) as unknown as CallAccount[];
    },
    // El gasto y la salud cambian solos: se refresca al volver a la pestaña.
    refetchOnWindowFocus: true,
    enabled: !reloginOpen,
  });
}

export function useCallNumbersQuery() {
  const { reloginOpen } = usePlatformAuth();
  return useQuery({
    queryKey: platformKeys.calls.numbers(),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/calls/numbers");
      return (data ?? []) as unknown as CallNumber[];
    },
    enabled: !reloginOpen,
  });
}

/** Agentes ACTIVOS del tenant destino — el selector de «quién contesta». */
export function useTenantCallAgentsQuery(companyId: string | null) {
  const { reloginOpen } = usePlatformAuth();
  return useQuery({
    queryKey: platformKeys.calls.tenantAgents(companyId ?? "none"),
    queryFn: async () => {
      const { data } = await platformClient.GET(
        "/api/v1/platform/calls/tenants/{companyId}/agents",
        { params: { path: { companyId: companyId ?? "" } } },
      );
      return (data ?? []) as unknown as TenantCallAgent[];
    },
    enabled: !reloginOpen && companyId !== null,
  });
}

export function useCreateCallAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      label: string;
      credentials: CallCredentials;
      daily_cap?: number;
      monthly_cap?: number;
    }) => {
      const { data } = await platformClient.POST("/api/v1/platform/calls/providers", {
        body: { provider: "twilio", ...input } as never,
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.calls.accounts() }),
  });
}

export function useRotateCallCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; credentials: CallCredentials }) => {
      await platformClient.PUT("/api/v1/platform/calls/providers/{id}/credentials", {
        params: { path: { id: input.id } },
        body: { credentials: input.credentials } as never,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.calls.accounts() }),
  });
}

export function useUpdateCallAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      enabled?: boolean;
      daily_cap?: number | null;
      monthly_cap?: number | null;
    }) => {
      const { id, ...patch } = input;
      await platformClient.PATCH("/api/v1/platform/calls/providers/{id}", {
        params: { path: { id } },
        body: patch as never,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.calls.accounts() }),
  });
}

export function useProbeCallAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await platformClient.POST("/api/v1/platform/calls/providers/{id}/health", {
        params: { path: { id } },
      });
      return data;
    },
    // La sonda PERSISTE la salud: es lo que lee la originación antes de llamar.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.calls.accounts() }),
  });
}

/** Los números que la cuenta YA posee en Twilio (comprados por fuera),
 * marcando cuáles están registrados en axi. Se consulta al abrir el sheet. */
export function useOwnedNumbersQuery(accountId: string | null) {
  const { reloginOpen } = usePlatformAuth();
  return useQuery({
    queryKey: platformKeys.calls.owned(accountId ?? "none"),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/calls/numbers/owned", {
        params: { query: { provider_account_id: accountId ?? "" } },
      });
      return (data ?? []) as unknown as OwnedTwilioNumber[];
    },
    enabled: !reloginOpen && accountId !== null,
  });
}

export function useImportCallNumber() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { provider_account_id: string; provider_sid: string }) => {
      const { data } = await platformClient.POST("/api/v1/platform/calls/numbers/import", {
        body: input as never,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: platformKeys.calls.numbers() });
      void queryClient.invalidateQueries({ queryKey: platformKeys.calls.all });
    },
  });
}

/** Identificadores de llamada VERIFICADOS en Twilio, marcando cuáles ya están
 * en axi. Se consulta al abrir el sheet «Importar identificador». */
export function useOwnedCallerIdsQuery(accountId: string | null) {
  const { reloginOpen } = usePlatformAuth();
  return useQuery({
    queryKey: platformKeys.calls.ownedCallerIds(accountId ?? "none"),
    queryFn: async () => {
      const { data } = await platformClient.GET("/api/v1/platform/calls/caller-ids/owned", {
        params: { query: { provider_account_id: accountId ?? "" } },
      });
      return (data ?? []) as unknown as OwnedCallerId[];
    },
    enabled: !reloginOpen && accountId !== null,
  });
}

export function useImportCallerId() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { provider_account_id: string; provider_sid: string }) => {
      const { data } = await platformClient.POST("/api/v1/platform/calls/caller-ids/import", {
        body: input as never,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: platformKeys.calls.numbers() });
      void queryClient.invalidateQueries({ queryKey: platformKeys.calls.all });
    },
  });
}

/** Buscar disponibles es gratis; el resultado es transitorio → mutación. */
export function useSearchCallNumbers() {
  return useMutation({
    mutationFn: async (input: {
      provider_account_id: string;
      country_code: string;
      contains?: string;
    }) => {
      const { data } = await platformClient.POST("/api/v1/platform/calls/numbers/search", {
        body: input as never,
      });
      return (data ?? []) as unknown as AvailableNumber[];
    },
  });
}

export function useBuyCallNumber() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      provider_account_id: string;
      phone_number: string;
      country_code: string;
    }) => {
      const { data } = await platformClient.POST("/api/v1/platform/calls/numbers", {
        body: input as never,
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.calls.numbers() }),
  });
}

export function useAssignCallNumber() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      company_id: string | null;
      default_ai_agent_id?: string | null;
      inbound_enabled?: boolean;
    }) => {
      const { id, ...body } = input;
      await platformClient.POST("/api/v1/platform/calls/numbers/{id}/assign", {
        params: { path: { id } },
        body: body as never,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.calls.numbers() }),
  });
}

export function useReleaseCallNumber() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await platformClient.DELETE("/api/v1/platform/calls/numbers/{id}", {
        params: { path: { id } },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.calls.numbers() }),
  });
}
