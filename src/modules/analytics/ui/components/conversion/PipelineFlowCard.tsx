"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { STAGE_KIND_LABELS, STAGE_KIND_ORDER } from "@/modules/crm/public";
import { DashboardCard } from "@/modules/dashboard/public";
import { PERIOD_LABELS, type FunnelDTO } from "@/modules/analytics/domain/analytics";
import { pipelineFlowRows } from "@/modules/analytics/domain/live-rates";
import type { Section } from "@/modules/analytics/infrastructure/stores/analytics.store";
import { useAuth } from "@/shared/auth/auth.hooks";
import { RateList, RateListSkeleton } from "./RateList";
import { SectionError, sectionRefetching } from "./section-states";

/**
 * «Recorrido del pipeline» (método comercial F7): por tipo semántico de etapa
 * (el orden del CRM, con el nombre que el tenant le puso), cuántos avanzan y
 * cuánto tardan: «Nuevo → Contactado · 71 % avanza · 3,2 días en promedio».
 * Es flujo del período, no probabilidad por oportunidad. El pie lleva al
 * editor del recorrido solo a quien puede cambiarlo (`crm:manage`).
 */
export function PipelineFlowCard({ section, onRetry }: { section: Section<FunnelDTO>; onRetry: () => void }) {
  const { hasPermission } = useAuth();
  const funnel = section.data;
  const title = funnel === null ? "Recorrido del pipeline" : `Recorrido del pipeline · ${PERIOD_LABELS[funnel.period]}`;
  return (
    <DashboardCard
      title={title}
      action={
        hasPermission("crm:manage") ? (
          <Link
            href="/crm/settings/recorrido"
            className="inline-flex items-center gap-1 rounded-md text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ajustar el recorrido
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        ) : undefined
      }
    >
      {section.status === "error" && funnel === null ? (
        <SectionError message={section.error} onRetry={onRetry} />
      ) : funnel === null ? (
        <RateListSkeleton label="Cargando el recorrido" />
      ) : (
        <div className={sectionRefetching(section)}>
          <PipelineFlow funnel={funnel} />
        </div>
      )}
    </DashboardCard>
  );
}

function PipelineFlow({ funnel }: { funnel: FunnelDTO }) {
  const stages = [...(funnel.pipeline?.stages ?? [])].sort(
    (a, b) => STAGE_KIND_ORDER.indexOf(a.stage_kind) - STAGE_KIND_ORDER.indexOf(b.stage_kind),
  );
  if (stages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sin movimientos entre etapas en este período, o tus etapas aún no tienen tipo en el recorrido.
      </p>
    );
  }
  return <RateList rows={pipelineFlowRows(stages, (kind) => STAGE_KIND_LABELS[kind])} label="Recorrido del pipeline" />;
}
