"use client";

import { MarketingHeader } from "@/modules/marketing/public";

import { useCaptureStats } from "../../infrastructure/stores/capture-stats.store";
import { LeadsNav } from "./LeadsNav";

/**
 * La cabecera de cada sección de captación: la de marketing (antetítulo,
 * título, para qué sirve, acciones y la barra del módulo) y, debajo, la
 * sub-navegación de captación con el contador de la bandeja.
 */
export function CaptureHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const quarantined = useCaptureStats((state) => state.stats?.quarantined ?? null);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <MarketingHeader kicker="Marketing · Captación" title={title} description={description} actions={actions} />
      <LeadsNav pendingCount={quarantined} />
    </div>
  );
}
