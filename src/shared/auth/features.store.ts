"use client";

import { create } from "zustand";

import type { Schemas } from "@/core/api/types";
import { http } from "@/core/services/http";

export type FeaturesDTO = Schemas["FeaturesDto"];
/** `GET /me/features`: las funciones y lo que sugiere cada tipo de negocio. */
export type MyFeaturesDTO = Schemas["MyFeaturesDto"];
export type NicheDefaults = MyFeaturesDTO["niche_defaults"];
export type FeatureDetailDTO = FeaturesDTO["features"][number];
export type FeatureSource = FeatureDetailDTO["source"];
export type FeatureBlocker = FeatureDetailDTO["blocked_by"];

type Status = "idle" | "loading" | "ready" | "error";

interface FeaturesState {
  status: Status;
  /** Usuario para el que se cargó: al cambiar de sesión se recarga. */
  for_user_id: string | null;
  features: FeatureDetailDTO[] | null;
  /** Qué funciones sugiere cada tipo de negocio (vista previa de Mi empresa › General). */
  niche_defaults: NicheDefaults | null;
  load: (userId: string) => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

let inflight: Promise<void> | null = null;

/**
 * Funciones del tenant (`GET /me/features`), una sola carga por sesión y
 * compartida por el panel. Es la lectura del mismo dato que aplica el
 * `FeaturesGuard` del backend: la UI oculta o adapta, el servidor manda.
 *
 * Copia deliberada de `entitlements.store`, incluido el fail-open: si la carga
 * falla, `hasFeature` responde `true`. Una UI que se esconde por un error de
 * red sería peor que una que deja al backend responder 403; y la garantía de
 * que un negocio sin la función no ve nada la da el dato, no esta caché — el
 * sidebar llega ya filtrado del servidor.
 */
export const useFeaturesStore = create<FeaturesState>((set, get) => ({
  status: "idle",
  for_user_id: null,
  features: null,
  niche_defaults: null,
  load: async (userId) => {
    if (get().for_user_id === userId && get().status !== "idle") return;
    if (inflight && get().for_user_id === userId) return inflight;
    set({ status: "loading", for_user_id: userId });
    inflight = fetchInto(set, get, userId);
    return inflight;
  },
  /** Tras cambiar el tipo de negocio o un interruptor: el origen cambia. */
  refresh: async () => {
    const userId = get().for_user_id;
    if (userId === null) return;
    inflight = fetchInto(set, get, userId);
    return inflight;
  },
  reset: () => {
    inflight = null;
    set({ status: "idle", for_user_id: null, features: null, niche_defaults: null });
  },
}));

function fetchInto(
  set: (partial: Partial<FeaturesState>) => void,
  get: () => FeaturesState,
  userId: string,
): Promise<void> {
  return http
    .get<MyFeaturesDTO>("/me/features")
    .then((payload) => {
      if (get().for_user_id !== userId) return;
      set({ features: payload.features, niche_defaults: payload.niche_defaults, status: "ready" });
    })
    .catch(() => {
      if (get().for_user_id !== userId) return;
      set({ features: null, niche_defaults: null, status: "error" });
    })
    .finally(() => {
      inflight = null;
    });
}

export function featureIn(features: FeatureDetailDTO[] | null, code: string): FeatureDetailDTO | null {
  return features?.find((row) => row.code === code) ?? null;
}

export function hasFeatureIn(features: FeatureDetailDTO[] | null, status: Status, code: string): boolean {
  if (status !== "ready" || features === null) return status === "error";
  return featureIn(features, code)?.enabled === true;
}

/** Solo para tests. */
export function resetFeaturesStore(): void {
  useFeaturesStore.getState().reset();
}
