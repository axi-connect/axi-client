"use client";

import Link from "next/link";
import { useState } from "react";
import { LayoutGrid, List, Plus, Sparkles } from "lucide-react";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { PipelineSummaryDialog } from "@/modules/crm/ui/components/PipelineSummaryDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { DealStatsPeriod } from "@/modules/crm/domain/deal";
import { useBoardStore, type CrmView } from "@/modules/crm/infrastructure/stores/board.store";

const PERIOD_LABELS: Record<DealStatsPeriod, string> = {
  today: "Hoy",
  "7d": "7 días",
  "30d": "30 días",
  "90d": "90 días",
};

/**
 * Cabecera del pipeline: selector de pipeline (persistido en localStorage),
 * período de KPIs, conmutador tablero/tabla y CTA de nueva oportunidad
 * (modal por ruta interceptada @form).
 */
export function PipelineHeader({ canOperate }: { canOperate: boolean }) {
  const { hasPermission } = useAuth();
  const pipelines = useBoardStore((s) => s.pipelines);
  const pipelineId = useBoardStore((s) => s.pipelineId);
  const selectPipeline = useBoardStore((s) => s.selectPipeline);
  const view = useBoardStore((s) => s.view);
  const setView = useBoardStore((s) => s.setView);
  const statsPeriod = useBoardStore((s) => s.statsPeriod);
  const setStatsPeriod = useBoardStore((s) => s.setStatsPeriod);
  const [summaryOpen, setSummaryOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {pipelines.length > 1 ? (
          <Select
            value={pipelineId ?? undefined}
            onValueChange={(value: string) => selectPipeline(value)}
          >
            <SelectTrigger className="h-9 w-44 rounded-full" aria-label="Pipeline activo">
              <SelectValue placeholder="Pipeline" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((pipeline) => (
                <SelectItem key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <h2 className="text-xl font-semibold tracking-tight">
            {pipelines[0]?.name ?? "Pipeline"}
          </h2>
        )}

        <Select
          value={statsPeriod}
          onValueChange={(value) => setStatsPeriod(value as DealStatsPeriod)}
        >
          <SelectTrigger className="h-9 w-28 rounded-full" aria-label="Período de métricas">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PERIOD_LABELS) as DealStatsPeriod[]).map((period) => (
              <SelectItem key={period} value={period}>
                {PERIOD_LABELS[period]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <SegmentedControl
          value={view}
          onValueChange={setView}
          label="Vista del pipeline"
          items={[
            { value: "board" as CrmView, label: "Tablero", icon: LayoutGrid },
            { value: "table" as CrmView, label: "Tabla", icon: List },
          ]}
        />
        {hasPermission("crm:copilot") && pipelineId !== null && (
          <Button
            variant="outline"
            className="rounded-full border-accent-violet/40 text-accent-violet hover:text-accent-violet"
            onClick={() => setSummaryOpen(true)}
          >
            <Sparkles className="size-4" />
            Resumen IA
          </Button>
        )}
        {canOperate && (
          <Button asChild className="rounded-full">
            <Link href="/crm/pipeline/create">
              <Plus className="size-4" />
              Oportunidad
            </Link>
          </Button>
        )}
      </div>

      {summaryOpen && pipelineId !== null && (
        <PipelineSummaryDialog pipelineId={pipelineId} onOpenChange={setSummaryOpen} />
      )}
    </div>
  );
}
