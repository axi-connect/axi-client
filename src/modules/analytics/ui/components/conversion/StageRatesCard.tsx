"use client";

import { DashboardCard } from "@/modules/dashboard/public";
import { PERIOD_LABELS, type FunnelDTO } from "@/modules/analytics/domain/analytics";
import { liveRateRows } from "@/modules/analytics/domain/live-rates";
import type { Section } from "@/modules/analytics/infrastructure/stores/analytics.store";
import { RateList, RateListSkeleton } from "./RateList";
import { SectionError, sectionRefetching } from "./section-states";

/**
 * «Tasas vivas» (método comercial F7): de cada paso del embudo comercial,
 * cuántos pasan al siguiente en el período, con su divisor a la vista. Son
 * las tasas con las que se traza la ruta del mes, medidas sobre la historia
 * real. Sale del MISMO `GET /analytics/funnel` que el embudo (`live_rates`):
 * sin fetch propio. Una fila sin muestra no se pinta; sin ninguna, una frase.
 */
export function StageRatesCard({ section, onRetry }: { section: Section<FunnelDTO>; onRetry: () => void }) {
  const funnel = section.data;
  const title = funnel === null ? "Tasas vivas" : `Tasas vivas · ${PERIOD_LABELS[funnel.period]}`;
  return (
    <DashboardCard title={title}>
      {section.status === "error" && funnel === null ? (
        <SectionError message={section.error} onRetry={onRetry} />
      ) : funnel === null ? (
        <RateListSkeleton label="Cargando tasas vivas" />
      ) : (
        <div className={sectionRefetching(section)}>
          <StageRates funnel={funnel} />
        </div>
      )}
    </DashboardCard>
  );
}

function StageRates({ funnel }: { funnel: FunnelDTO }) {
  const rows = funnel.live_rates === null ? [] : liveRateRows(funnel.live_rates, funnel.currency);
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no hay llamadas, citas ni ventas medidas en este período. Cuando las haya, aquí verás cuántos pasan de un paso al siguiente.
      </p>
    );
  }
  return <RateList rows={rows} label="Tasas vivas" />;
}
