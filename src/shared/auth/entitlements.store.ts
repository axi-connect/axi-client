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
  /** Momento de la última carga buena: `revalidate` no relee antes de tiempo. */
  loaded_at: number | null;
  load: (userId: string) => Promise<void>;
  /**
   * Relectura silenciosa (sin pasar por `loading`): un cambio de plan en
   * platform llega al tenant ya logueado al volver a la pestaña, sin cerrar
   * sesión. No relee si la última carga tiene menos de `REVALIDATE_AFTER_MS`.
   */
  revalidate: (userId: string) => Promise<void>;
  reset: () => void;
}

let inflight: Promise<void> | null = null;

export const REVALIDATE_AFTER_MS = 60_000;

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
  loaded_at: null,
  load: async (userId) => {
    if (get().for_user_id === userId && get().status !== "idle") return;
    if (inflight && get().for_user_id === userId) return inflight;
    set({ status: "loading", for_user_id: userId });
    inflight = http
      .get<EntitlementsDTO>("/me/entitlements")
      .then((entitlements) => {
        if (get().for_user_id !== userId) return;
        set({ entitlements, status: "ready", loaded_at: Date.now() });
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
  revalidate: async (userId) => {
    const { for_user_id, status, loaded_at } = get();
    if (for_user_id !== userId || status !== "ready" || inflight) return;
    if (loaded_at !== null && Date.now() - loaded_at < REVALIDATE_AFTER_MS) return;
    inflight = http
      .get<EntitlementsDTO>("/me/entitlements")
      .then((entitlements) => {
        if (get().for_user_id !== userId) return;
        set({ entitlements, loaded_at: Date.now() });
      })
      // Un fallo al releer conserva lo que ya había: no se degrada a `error`
      .catch(() => undefined)
      .finally(() => {
        inflight = null;
      });
    return inflight;
  },
  reset: () => {
    inflight = null;
    set({ status: "idle", for_user_id: null, entitlements: null, loaded_at: null });
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
