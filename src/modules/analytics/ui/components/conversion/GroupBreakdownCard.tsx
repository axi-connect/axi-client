"use client";

import { Users } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { formatMoney } from "@/core/lib/format";
import { CardEmpty, DashboardCard } from "@/modules/dashboard/ui/components/MetricTile";
import { Progress } from "@/shared/components/ui/progress";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { SectionError, sectionRefetching } from "./section-states";
import type { Section } from "@/modules/analytics/infrastructure/stores/analytics.store";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import type {
  FunnelGroup,
  FunnelGroupBy,
} from "@/modules/analytics/domain/analytics";

const GROUP_TABS: { key: FunnelGroupBy; label: string }[] = [
  { key: "agent", label: "Por agente" },
  { key: "channel", label: "Por canal" },
  { key: "intention", label: "Por intención" },
];

/**
 * Card "¿Quién convierte mejor?": desglose del funnel por agente/canal/
 * intención (lazy por dimensión). La mini-barra compara la tasa de cierre
 * contra la MEJOR del grupo (comparativa relativa). `label null` = "Sin asignar".
 */
export function GroupBreakdownCard({
  groupBy,
  section,
  currency,
  onGroupByChange,
  onRetry,
}: {
  groupBy: FunnelGroupBy;
  section: Section<FunnelGroup[]>;
  currency: string;
  onGroupByChange: (groupBy: FunnelGroupBy) => void;
  onRetry: () => void;
}) {
  const groups = [...(section.data ?? [])].sort(
    (a, b) => b.rates.close_rate_paid - a.rates.close_rate_paid,
  );
  const bestRate = groups[0]?.rates.close_rate_paid ?? 0;

  return (
    <DashboardCard
      title="¿Quién convierte mejor?"
      action={
        <SegmentedControl
          value={groupBy}
          onValueChange={onGroupByChange}
          label="Dimensión del desglose"
          size="sm"
          surface="inline"
          items={GROUP_TABS.map((tab) => ({ value: tab.key, label: tab.label }))}
        />
      }
    >
      {section.status === "error" ? (
        <SectionError message={section.error} onRetry={onRetry} />
      ) : section.data === null ? (
        <div role="status" aria-label="Cargando desglose" className="space-y-3">
          <Skeleton className="h-9 rounded-lg" />
          <Skeleton className="h-9 rounded-lg" />
          <Skeleton className="h-9 rounded-lg" />
        </div>
      ) : groups.length === 0 ? (
        <CardEmpty
          icon={<Users aria-hidden className="size-6" />}
          message="Sin datos para este desglose en el período."
        />
      ) : (
        <div className={cn("overflow-x-auto", sectionRefetching(section))}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 font-medium">Nombre</th>
                <th className="pb-2 text-right font-medium">Conv.</th>
                <th className="pb-2 text-right font-medium">Ventas</th>
                <th className="w-[38%] pb-2 pl-4 font-medium">Tasa de cierre</th>
                <th className="hidden pb-2 text-right font-medium sm:table-cell">
                  Ventas ($)
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.key ?? "unassigned"} className="border-t border-border">
                  <td className="max-w-40 truncate py-2.5 pr-2 font-medium">
                    {group.label ?? "Sin asignar"}
                    <span className="block text-xs font-normal text-muted-foreground sm:hidden">
                      {formatMoney(group.stages.revenue_paid_cents, currency)}
                    </span>
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                    {group.stages.conversations.toLocaleString("es-CO")}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {group.stages.closed_won.toLocaleString("es-CO")}
                  </td>
                  <td className="py-2.5 pl-4">
                    <div className="flex items-center gap-2">
                      <Progress
                        aria-label={`Tasa de cierre de ${group.label ?? "sin asignar"}`}
                        value={bestRate > 0 ? (group.rates.close_rate_paid / bestRate) * 100 : 0}
                        className="h-1.5"
                      />
                      <span className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums">
                        {group.rates.close_rate_paid.toLocaleString("es-CO", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}{" "}
                        %
                      </span>
                    </div>
                  </td>
                  <td className="hidden py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                    {formatMoney(group.stages.revenue_paid_cents, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardCard>
  );
}
