"use client";

import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { useAnalyticsStore } from "@/modules/analytics/infrastructure/stores/analytics.store";
import { KpiRowSkeleton } from "@/modules/analytics/ui/AnalyticsSkeletons";
import { StaggerIn } from "@/modules/analytics/ui/components/StaggerIn";
import { EmptyState } from "@/shared/components/features/empty-state";
import { KpiHeroRow } from "./KpiHeroRow";
import { FunnelCard } from "./FunnelCard";
import { TrendCard } from "./TrendCard";
import { GroupBreakdownCard } from "./GroupBreakdownCard";
import { VoiceCard } from "./VoiceCard";
import { SectionError, sectionRefetching } from "./section-states";

/**
 * Tab Conversión: el plano determinista del negocio (funnel de ventas).
 * Todo sale de UN fetch (`/analytics/funnel?group_by=agent`); el desglose por
 * canal/intención es lazy. Empty full-tab cuando no hubo conversaciones.
 */
export function ConversionTab({ onGoToQuality }: { onGoToQuality?: () => void }) {
  const funnel = useAnalyticsStore((state) => state.funnel);
  const groupBy = useAnalyticsStore((state) => state.groupBy);
  const groups = useAnalyticsStore((state) => state.groups);
  const setGroupBy = useAnalyticsStore((state) => state.setGroupBy);
  const loadConversion = useAnalyticsStore((state) => state.loadConversion);
  const voice = useAnalyticsStore((state) => state.voice);
  const loadVoice = useAnalyticsStore((state) => state.loadVoice);

  // Empty state de tab completo: el período no tuvo NINGUNA conversación.
  if (funnel.status === "ready" && funnel.data?.stages.conversations === 0) {
    return (
      <EmptyState
        glyph="metrics"
        variant="solid"
        title="Aún no hay conversaciones en este período"
        description="Cuando tus agentes empiecen a atender clientes, aquí verás cuántas se convierten en ventas."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/agents">Ver mis agentes →</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <StaggerIn index={0}>
        {funnel.status === "error" && funnel.data === null ? (
          <div className="rounded-2xl border border-border bg-background p-5">
            <SectionError message={funnel.error} onRetry={() => void loadConversion()} />
          </div>
        ) : funnel.data === null ? (
          <KpiRowSkeleton />
        ) : (
          <div className={sectionRefetching(funnel)}>
            <KpiHeroRow funnel={funnel.data} />
          </div>
        )}
      </StaggerIn>

      <StaggerIn index={1}>
        <FunnelCard
          section={funnel}
          onRetry={() => void loadConversion()}
          onGoToQuality={onGoToQuality}
        />
      </StaggerIn>

      <StaggerIn index={2}>
        <TrendCard section={funnel} onRetry={() => void loadConversion()} />
      </StaggerIn>

      <StaggerIn index={3}>
        <GroupBreakdownCard
          groupBy={groupBy}
          section={groups[groupBy]}
          currency={funnel.data?.currency ?? "COP"}
          onGroupByChange={setGroupBy}
          onRetry={() => setGroupBy(groupBy)}
        />
      </StaggerIn>

      <StaggerIn index={4}>
        <VoiceCard section={voice} onRetry={() => void loadVoice()} />
      </StaggerIn>
    </div>
  );
}
