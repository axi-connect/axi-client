"use client";

import Link from "next/link";
import { LayoutGrid, List, Plus } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
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

function SegmentedToggle({
  view,
  onChange,
}: {
  view: CrmView;
  onChange: (view: CrmView) => void;
}) {
  const options: Array<{ value: CrmView; label: string; icon: React.ReactNode }> = [
    { value: "board", label: "Tablero", icon: <LayoutGrid aria-hidden className="size-3.5" /> },
    { value: "table", label: "Tabla", icon: <List aria-hidden className="size-3.5" /> },
  ];
  return (
    <div
      role="tablist"
      aria-label="Vista del pipeline"
      className="flex items-center rounded-full border border-border bg-secondary/60 p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={view === option.value}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            view === option.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Cabecera del pipeline: selector de pipeline (persistido en localStorage),
 * período de KPIs, conmutador tablero/tabla y CTA de nueva oportunidad
 * (modal por ruta interceptada @form).
 */
export function PipelineHeader({ canOperate }: { canOperate: boolean }) {
  const pipelines = useBoardStore((s) => s.pipelines);
  const pipelineId = useBoardStore((s) => s.pipelineId);
  const selectPipeline = useBoardStore((s) => s.selectPipeline);
  const view = useBoardStore((s) => s.view);
  const setView = useBoardStore((s) => s.setView);
  const statsPeriod = useBoardStore((s) => s.statsPeriod);
  const setStatsPeriod = useBoardStore((s) => s.setStatsPeriod);

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
        <SegmentedToggle view={view} onChange={setView} />
        {canOperate && (
          <Button asChild className="rounded-full">
            <Link href="/crm/pipeline/create">
              <Plus className="size-4" />
              Oportunidad
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
