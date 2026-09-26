"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { relativeTime } from "@/core/lib/relative-time";
import { Button } from "@/shared/components/ui/button";
import { TableSkeleton } from "@/shared/components/features/loading";
import type { ImportJobDTO } from "@/modules/crm/domain/import";
import { listImports } from "@/modules/crm/infrastructure/services/imports-service.adapter";
import { ContactImportWizard } from "@/modules/crm/ui/components/imports/ContactImportWizard";
import { ImportReport, ImportStatusBadge } from "@/modules/crm/ui/components/imports/ImportReport";
import { BulkFollowUpButton } from "@/modules/crm/ui/components/BulkFollowUpButton";
import { EnrollInSequenceButton } from "@/modules/crm/ui/components/EnrollInSequenceButton";

/**
 * `/crm/settings/imports` (gate contacts:import): el MISMO asistente que abre
 * «Importar / Exportar» en Contactos, embebido, más el historial de jobs. Un
 * job del historial reabre su reporte; «Nuevo import» vuelve al asistente.
 */
export function ImportsManager() {
  const [selected, setSelected] = useState<ImportJobDTO | null>(null);
  const [history, setHistory] = useState<ImportJobDTO[] | null>(null);

  const refreshHistory = useCallback(() => {
    listImports()
      .then(setHistory)
      .catch(() => setHistory([]));
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  return (
    <div className="@container min-w-0">
      <div className="grid min-w-0 items-start gap-4 @min-[64rem]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-3xl border border-border bg-card p-5">
          {selected !== null ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="min-w-0 truncate font-heading text-base font-bold" title={selected.filename}>
                    {selected.filename}
                  </h2>
                  <ImportStatusBadge status={selected.status} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setSelected(null)}
                  >
                    <RotateCcw className="size-3.5" />
                    Nuevo import
                  </Button>
                  {/* F4a: el final del camino. Sin esto, la lista entra y nadie
                      la trabaja — que es donde un CRM se queda en agenda. */}
                  {selected.status !== "failed" && selected.created_count > 0 && (
                    <>
                      <BulkFollowUpButton
                        audience={{ source: "import", import_job_id: selected.id }}
                        audienceLabel={`Del import ${selected.filename}`}
                        label={`Poner al agente a trabajar con los ${String(selected.created_count)}`}
                      />
                      <EnrollInSequenceButton
                        audience={{ source: "import", import_job_id: selected.id }}
                      />
                    </>
                  )}
                </div>
              </div>
              {selected.status === "failed" ? (
                <p
                  role="alert"
                  className="rounded-2xl border border-destructive/40 bg-destructive/6 px-3.5 py-3 text-sm"
                >
                  {selected.errors[0]?.message ?? "La importación falló"}
                </p>
              ) : (
                <ImportReport job={selected} />
              )}
            </div>
          ) : (
            <ContactImportWizard variant="embedded" onJobDone={refreshHistory} />
          )}
        </div>

        <section className="min-w-0 overflow-hidden rounded-3xl border border-border bg-card" aria-label="Historial">
          <h2 className="px-5 pt-4 pb-2 font-heading text-base font-bold">Historial</h2>
          {history === null ? (
            <div className="px-5 pb-5">
              <TableSkeleton rows={3} showHeader={false} />
            </div>
          ) : history.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">Todavía no has importado contactos.</p>
          ) : (
            <ul className="sidebar-scroll max-h-[32rem] overflow-y-auto border-t border-border">
              {history.map((job) => (
                <li key={job.id} className="border-t border-border first:border-t-0">
                  <button
                    type="button"
                    aria-pressed={selected?.id === job.id}
                    className={cn(
                      "grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none",
                      selected?.id === job.id && "bg-muted/60",
                    )}
                    onClick={() => setSelected(job)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium" title={job.filename}>
                        {job.filename}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground tabular-nums">
                        {relativeTime(job.created_at)} · {job.created_count} creados · {job.error_count} errores
                      </span>
                    </span>
                    <ImportStatusBadge status={job.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
