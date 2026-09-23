"use client";

import { useEffect, useMemo } from "react";

import { useCommercialStore } from "@/modules/commercial/infrastructure/stores/commercial.store";
import { useAuth } from "@/shared/auth/auth.hooks";
import { useEntitlements } from "@/shared/auth/entitlements.hooks";

/** Las tasas de cierre con las que el plan puede trazar la ruta. */
export type RouteRateKey = "quote_to_sale" | "meeting_to_sale";

/**
 * Qué tasas de cierre USA la ruta del mes, leído de `plan.inputs` (C11 de la
 * auditoría F6/F7): una tasa está en la ruta si el plan la trae (`null` =
 * el negocio no vende con cita). Autosuficiente como `useGoalChip`: carga del
 * store del slice y devuelve `null` —no se marca nada— sin capacidad `crm`,
 * sin permiso, sin meta o sin plan. Lo consume `analytics` («Tasas vivas»)
 * para marcar la fila por dato, no a mano.
 */
export function useRouteRates(): ReadonlySet<RouteRateKey> | null {
  const { hasPermission } = useAuth();
  const { loaded, hasCapability } = useEntitlements();
  const goalStatus = useCommercialStore((state) => state.goal.status);
  const inputs = useCommercialStore((state) => state.plan.data?.inputs ?? null);
  const load = useCommercialStore((state) => state.load);

  const enabled = loaded && hasCapability("crm") && hasPermission("commercial:read");

  useEffect(() => {
    if (enabled && goalStatus === "idle") void load();
  }, [enabled, goalStatus, load]);

  return useMemo(() => {
    if (!enabled || inputs === null) return null;
    // La cotización → venta siempre traza la ruta (el contrato no la deja en
    // `null`); la de cita, solo si el negocio vende con cita.
    const keys = new Set<RouteRateKey>(["quote_to_sale"]);
    if (inputs.meeting_to_sale !== null) keys.add("meeting_to_sale");
    return keys;
  }, [enabled, inputs]);
}
