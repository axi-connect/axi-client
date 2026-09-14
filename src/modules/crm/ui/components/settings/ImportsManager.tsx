"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { relativeTime } from "@/core/lib/relative-time";
import { Button } from "@/shared/components/ui/button";
import { TableSkeleton } from "@/shared/components/features/loading";
import type { ImportJobDTO } from "@/modules/crm/domain/import";
import { listImports } from "@/modules/crm/infrastructure/services/imports-service.adapter";
import { ContactImportWizard } from "@/modules/crm/ui/components/imports/ContactImportWizard";
import { ImportReport, ImportStatusBadge } from "@/modules/crm/ui/components/imports/ImportReport";

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
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-background p-4 md:p-6">
        {selected !== null ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold">{selected.filename}</h3>
                <ImportStatusBadge status={selected.status} />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setSelected(null)}
              >
                <RotateCcw className="size-3.5" />
                Nuevo import
              </Button>
            </div>
            {selected.status === "failed" ? (
              <p
                role="alert"
                className="rounded-xl border border-destructive/40 bg-destructive/6 px-3.5 py-3 text-sm"
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

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Historial</h3>
        {history === null ? (
          <TableSkeleton rows={3} showHeader={false} />
        ) : history.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Todavía no has importado contactos.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-background">
            {history.map((job) => (
              <li key={job.id}>
                <button
                  type="button"
                  className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors hover:bg-accent/40"
                  onClick={() => setSelected(job)}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{job.filename}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {relativeTime(job.created_at)} · {job.created_count} creados ·{" "}
                      {job.error_count} errores
                    </p>
                  </div>
                  <ImportStatusBadge status={job.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
