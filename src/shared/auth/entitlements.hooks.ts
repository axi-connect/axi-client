"use client";

import { useCallback, useEffect } from "react";

import { useAuthContext } from "../../core/providers/auth-provider";
import { hasCapabilityIn, useEntitlementsStore, type EntitlementsDTO } from "./entitlements.store";

/**
 * Capacidades del plan del tenant para gatear UI. `loaded` distingue «aún no
 * sé» de «no la tiene»: mientras carga, quien pinta secciones caras debe
 * esperar en vez de mostrar y luego quitar.
 */
export function useEntitlements(): {
  entitlements: EntitlementsDTO | null;
  loaded: boolean;
  hasCapability: (capability: string) => boolean;
} {
  const { user } = useAuthContext();
  const status = useEntitlementsStore((state) => state.status);
  const entitlements = useEntitlementsStore((state) => state.entitlements);
  const load = useEntitlementsStore((state) => state.load);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (userId) void load(userId);
  }, [userId, load]);

  const hasCapability = useCallback(
    (capability: string) => hasCapabilityIn(entitlements, status, capability),
    [entitlements, status],
  );

  return { entitlements, loaded: status === "ready" || status === "error", hasCapability };
}
