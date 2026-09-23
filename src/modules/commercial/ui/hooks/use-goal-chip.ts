"use client";

import { useEffect } from "react";

import { progressPct } from "@/modules/commercial/domain/pace";
import { useCommercialStore } from "@/modules/commercial/infrastructure/stores/commercial.store";
import { useAuth } from "@/shared/auth/auth.hooks";
import { useEntitlements } from "@/shared/auth/entitlements.hooks";

export interface GoalChip {
  /** Camino recorrido de la meta del mes, 0–100 entero (nunca negativo). */
  pct: number;
  /** «Meta · 41 %». */
  label: string;
  href: "/comercial";
}

/**
 * El chip «Meta · 41 %» del briefing de Axel (F7): autosuficiente, lee del
 * store del slice (`GET /commercial/goal` y, con meta, `/commercial/pace`) y
 * devuelve `null` —no pinta nada— sin capacidad `crm`, sin permiso de
 * lectura, mientras carga, con error o sin meta. El `BriefingHero` no expone
 * la meta en su DTO, así que el chip no depende del informe: sale de la
 * misma fuente que la ruta del mes.
 */
export function useGoalChip(): GoalChip | null {
  const { hasPermission } = useAuth();
  const { loaded, hasCapability } = useEntitlements();
  const goal = useCommercialStore((state) => state.goal);
  const pace = useCommercialStore((state) => state.pace);
  const blocker = useCommercialStore((state) => state.blocker);
  const load = useCommercialStore((state) => state.load);

  const enabled = loaded && hasCapability("crm") && hasPermission("commercial:read");

  useEffect(() => {
    if (enabled && goal.status === "idle") void load();
  }, [enabled, goal.status, load]);

  if (!enabled || blocker !== null || goal.data?.goal == null || pace.data === null) return null;
  const pct = Math.round(progressPct(pace.data.actual_revenue_cents, pace.data.target_revenue_cents));
  return { pct, label: `Meta · ${String(pct)} %`, href: "/comercial" };
}
