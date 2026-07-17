"use client";

import { DashboardCard } from "@/modules/dashboard/ui/components/MetricTile";
import { FunnelSkeleton } from "@/modules/analytics/ui/AnalyticsSkeletons";
import { FunnelBars } from "@/modules/analytics/ui/components/charts/FunnelBars";
import { SectionError, sectionRefetching } from "./section-states";
import type { Section } from "@/modules/analytics/infrastructure/stores/analytics.store";
import type { FunnelDTO } from "@/modules/analytics/domain/analytics";

/** Card "Embudo de ventas": estados de sección + FunnelBars. */
export function FunnelCard({
  section,
  onRetry,
  onGoToQuality,
}: {
  section: Section<FunnelDTO>;
  onRetry: () => void;
  onGoToQuality?: () => void;
}) {
  return (
    <DashboardCard title="Embudo de ventas">
      {section.status === "error" ? (
        <SectionError message={section.error} onRetry={onRetry} />
      ) : section.data === null ? (
        <FunnelSkeleton />
      ) : (
        <div className={sectionRefetching(section)}>
          <FunnelBars funnel={section.data} onGoToQuality={onGoToQuality} />
        </div>
      )}
    </DashboardCard>
  );
}
