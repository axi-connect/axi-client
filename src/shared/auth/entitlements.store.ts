"use client";

import { create } from "zustand";

import type { Schemas } from "@/core/api/types";
import { http } from "@/core/services/http";

export type EntitlementsDTO = Schemas["EntitlementsDto"];

type Status = "idle" | "loading" | "ready" | "error";

interface EntitlementsState {
  status: Status;
  /** Usuario para el que se cargó: al cambiar de sesión se recarga. */
  for_user_id: string | null;
  entitlements: EntitlementsDTO | null;
  load: (userId: string) => Promise<void>;
  reset: () => void;
}

let inflight: Promise<void> | null = null;

/**
 * Capacidades del plan del tenant (`GET /me/entitlements`), una sola carga por
 * sesión y compartida por todo el panel (dashboard, onboarding, futuros
 * gates de UI). Es la lectura del mismo dato que el `EntitlementsGuard`
 * aplica en el backend: la UI oculta o adapta, el servidor manda.
 *
 * Si la carga falla, `hasCapability` responde `true`: una UI que se esconde
 * por un error de red sería peor que una que deja al backend decir 403.
 */
export const useEntitlementsStore = create<EntitlementsState>((set, get) => ({
  status: "idle",
  for_user_id: null,
  entitlements: null,
  load: async (userId) => {
    if (get().for_user_id === userId && get().status !== "idle") return;
    if (inflight && get().for_user_id === userId) return inflight;
    set({ status: "loading", for_user_id: userId });
    inflight = http
      .get<EntitlementsDTO>("/me/entitlements")
      .then((entitlements) => {
        if (get().for_user_id !== userId) return;
        set({ entitlements, status: "ready" });
      })
      .catch(() => {
        if (get().for_user_id !== userId) return;
        set({ entitlements: null, status: "error" });
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  },
  reset: () => {
    inflight = null;
    set({ status: "idle", for_user_id: null, entitlements: null });
  },
}));

export function hasCapabilityIn(entitlements: EntitlementsDTO | null, status: Status, capability: string): boolean {
  if (status !== "ready" || entitlements === null) return status === "error";
  return entitlements.capabilities.includes(capability);
}

/** Solo para tests. */
export function resetEntitlementsStore(): void {
  useEntitlementsStore.getState().reset();
}
