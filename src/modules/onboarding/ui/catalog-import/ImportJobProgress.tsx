"use client";

import { FileSpreadsheet, FileText, Image as ImageIcon, LoaderCircle } from "lucide-react";

import { formatBytes } from "@/core/lib/format";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  importProgressLabel,
  importProgressRatio,
  type CatalogImportDTO,
} from "@/modules/onboarding/domain/catalog-import";

const SOURCE_ICON = { sheet: FileSpreadsheet, pdf: FileText, image: ImageIcon } as const;

/**
 * Tarjeta del job en proceso: archivo, barra de avance (o indeterminada si el
 * job no informa páginas) y una línea de estado en `role="status"`. Con
 * `stalled`, avisa de que tarda más de lo normal y ofrece seguir esperando o
 * continuar con los agentes: un import que dura no debe secuestrar el onboarding.
 */
export function ImportJobProgress({
  job,
  stalled,
  onKeepWaiting,
  onContinueLater,
}: {
  job: CatalogImportDTO;
  stalled: boolean;
  onKeepWaiting: () => void;
  onContinueLater: () => void;
}) {
  const Icon = SOURCE_ICON[job.source_kind] ?? FileText;
  const ratio = importProgressRatio(job);
  const meta = [job.pages_total ? `${job.pages_total} páginas` : null, formatBytes(job.size_bytes)].filter(Boolean).join(" · ");

  return (
    <div className="border-border bg-background/70 flex flex-col gap-4 rounded-2xl border p-5">
      <div className="flex items-center gap-3">
        <span className="bg-success/12 text-success grid size-10 shrink-0 place-items-center rounded-xl">
          <Icon aria-hidden="true" className="size-[1.125rem]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{job.file_name}</p>
          <p className="text-muted-foreground text-xs">{meta}</p>
        </div>
        <Badge variant={stalled ? "warning" : "secondary"} className={stalled ? "" : "text-accent-violet bg-accent-violet/12"}>
          {stalled ? "Tardando más" : "Analizando"}
        </Badge>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={ratio === null ? undefined : Math.round(ratio * 100)}
        aria-valuetext={importProgressLabel(job)}
        className="bg-primary/20 relative h-2 overflow-hidden rounded-full"
      >
        <div
          className={ratio === null ? "bg-brand-gradient absolute inset-y-0 w-1/3 animate-pulse rounded-full" : "bg-brand-gradient absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"}
          style={ratio === null ? undefined : { width: `${Math.max(ratio * 100, 4)}%` }}
        />
      </div>

      <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm">
        <LoaderCircle aria-hidden="true" className="text-brand size-4 animate-spin motion-reduce:animate-none" />
        {importProgressLabel(job)}
      </p>

      {stalled ? (
        <div className="flex flex-col gap-3">
          <p className="border-warning/40 bg-warning/10 rounded-xl border px-4 py-3 text-sm leading-relaxed">
            Este archivo está tardando más de lo normal. Puedes seguir esperando o continuar con los agentes: el análisis sigue y lo retomas aquí.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onKeepWaiting}>
              Seguir esperando
            </Button>
            <Button variant="ghost" size="sm" onClick={onContinueLater}>
              Continuar con los agentes
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2" aria-hidden="true">
          {[1, 0.8, 0.6, 0.4].map((opacity) => (
            <Skeleton key={opacity} className="h-9 w-full rounded-lg" style={{ opacity }} />
          ))}
        </div>
      )}
    </div>
  );
}
