"use client";

import { LayoutGrid, List, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { formatMillions } from "@/core/lib/format";
import type { DealStatsDTO, DealStatsPeriod } from "@/modules/crm/domain/deal";
import { useBoardStore, type CrmView } from "@/modules/crm/infrastructure/stores/board.store";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

import { PERIOD_LABELS } from "./PipelineSummary";
import { PipelineSummaryDialog } from "./PipelineSummaryDialog";

const PERIODS = (Object.keys(PERIOD_LABELS) as DealStatsPeriod[]).map((value) => ({
  value,
  label: PERIOD_LABELS[value],
}));

/**
 * Cabecera del pipeline (lienzo CRM premium F1): el título con el pipeline
 * activo en píldora, la frase de lo que hay en juego, y las acciones. Debajo,
 * el período de los cierres —lo único que cambia con él son las ganadas y la
 * tasa—. En el celular las acciones bajan a su propia fila y los botones se
 * quedan en icono con su nombre para el lector de pantalla.
 */
export function PipelineHeader({ canOperate, stats }: { canOperate: boolean; stats: DealStatsDTO | null }) {
  const { hasPermission } = useAuth();
  const pipelines = useBoardStore((s) => s.pipelines);
  const pipelineId = useBoardStore((s) => s.pipelineId);
  const selectPipeline = useBoardStore((s) => s.selectPipeline);
  const view = useBoardStore((s) => s.view);
  const setView = useBoardStore((s) => s.setView);
  const statsPeriod = useBoardStore((s) => s.statsPeriod);
  const setStatsPeriod = useBoardStore((s) => s.setStatsPeriod);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const active = pipelines.find((p) => p.id === pipelineId) ?? pipelines[0];
  const pipelineName = active?.name ?? "Pipeline";

  return (
    <div className="flex shrink-0 flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-heading text-3xl leading-tight font-bold tracking-tight md:text-4xl">Pipeline</h1>
            {pipelines.length > 1 ? (
              <Select value={pipelineId ?? undefined} onValueChange={(value: string) => selectPipeline(value)}>
                <SelectTrigger className="h-9 w-auto max-w-[16rem] min-w-0 rounded-full bg-card font-medium [&>span]:truncate" aria-label="Pipeline activo">
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
              active !== undefined && (
                <span
                  className="inline-flex h-9 max-w-[16rem] min-w-0 items-center truncate rounded-full border border-border bg-card px-4 text-sm font-medium"
                  title={pipelineName}
                >
                  <span className="truncate">{pipelineName}</span>
                </span>
              )
            )}
          </div>
          <p className="text-sm text-pretty text-muted-foreground">
            {stats === null ? (
              "Cargando lo que hay en juego…"
            ) : (
              <>
                <span className="whitespace-nowrap">
                  {stats.open_count === 1 ? "1 oportunidad abierta" : `${stats.open_count} oportunidades abiertas`}
                </span>{" "}
                · <span className="whitespace-nowrap">{formatMillions(stats.open_value_cents, stats.currency)} en juego</span>
              </>
            )}
          </p>
        </div>

        <div className="flex max-w-full min-w-0 items-center gap-2">
          <SegmentedControl
            value={view}
            onValueChange={setView}
            label="Vista del pipeline"
            labels="auto"
            items={[
              { value: "board" as CrmView, label: "Tablero", icon: LayoutGrid },
              { value: "table" as CrmView, label: "Tabla", icon: List },
            ]}
          />
          {hasPermission("crm:copilot") && pipelineId !== null && (
            <Button variant="outline" className="rounded-full" onClick={() => setSummaryOpen(true)}>
              <Sparkles className="size-4 text-accent-violet" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Resumen de Axi</span>
            </Button>
          )}
          {canOperate && (
            <Button asChild className="rounded-full">
              <Link href="/crm/pipeline/create">
                <Plus className="size-4" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Nueva oportunidad</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-xs text-muted-foreground">Cierres de</span>
        <SegmentedControl
          value={statsPeriod}
          onValueChange={setStatsPeriod}
          label="Período de las métricas"
          size="sm"
          items={PERIODS}
        />
      </div>

      {summaryOpen && pipelineId !== null && (
        <PipelineSummaryDialog pipelineId={pipelineId} pipelineName={pipelineName} onOpenChange={setSummaryOpen} />
      )}
    </div>
  );
}
