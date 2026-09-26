"use client";

import { useRef } from "react";

import type { ProspectingStatsDTO } from "../../domain/lead";
import { useCaptureStats } from "../../infrastructure/stores/capture-stats.store";

/**
 * Siembra las cifras del embudo con lo que el layout precargó en el servidor.
 * Una sola vez por montaje del layout: al navegar entre secciones el layout
 * persiste y las cifras que ya movió la bandeja no se pisan con las viejas.
 */
export function CaptureStatsSeed({ stats, children }: { stats: ProspectingStatsDTO | null; children: React.ReactNode }) {
  const seeded = useRef(false);
  if (!seeded.current) {
    seeded.current = true;
    if (stats !== null) useCaptureStats.getState().seed(stats);
  }
  return children;
}
