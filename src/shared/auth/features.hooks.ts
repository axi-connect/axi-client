"use client";

import { useCallback, useEffect } from "react";

import { useAuthContext } from "../../core/providers/auth-provider";
import {
  featureIn,
  hasFeatureIn,
  useFeaturesStore,
  type FeatureBlocker,
  type FeatureDetailDTO,
  type FeatureSource,
} from "./features.store";

/**
 * Funciones del tenant para gatear UI (pestañas del hub Pagos, Cartera, panel
 * del inbox). `loaded` distingue «aún no sé» de «no la tiene»: quien pinta
 * pestañas espera en vez de mostrar y quitar.
 */
export function useFeatures(): {
  features: FeatureDetailDTO[] | null;
  loaded: boolean;
  hasFeature: (code: string) => boolean;
  featureSource: (code: string) => FeatureSource | null;
  /** Por qué no está activa aunque se haya decidido encenderla. */
  featureBlockedBy: (code: string) => FeatureBlocker;
  refresh: () => Promise<void>;
} {
  const { user } = useAuthContext();
  const status = useFeaturesStore((state) => state.status);
  const features = useFeaturesStore((state) => state.features);
  const load = useFeaturesStore((state) => state.load);
  const refresh = useFeaturesStore((state) => state.refresh);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (userId) void load(userId);
  }, [userId, load]);

  const hasFeature = useCallback((code: string) => hasFeatureIn(features, status, code), [features, status]);
  const featureSource = useCallback((code: string) => featureIn(features, code)?.source ?? null, [features]);
  const featureBlockedBy = useCallback((code: string) => featureIn(features, code)?.blocked_by ?? null, [features]);

  return {
    features,
    loaded: status === "ready" || status === "error",
    hasFeature,
    featureSource,
    featureBlockedBy,
    refresh,
  };
}
