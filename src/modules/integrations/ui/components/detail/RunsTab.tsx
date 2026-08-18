"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  SYNC_PHASE_LABELS,
  isRunActive,
  type SyncRunDTO,
} from "@/modules/integrations/domain/integration";
import { useSyncRunsPolling } from "@/modules/integrations/infrastructure/hooks/use-sync-runs-polling";
import { listIntegrationRuns } from "@/modules/integrations/infrastructure/services/integrations-service.adapter";

/**
 * Pestaña Historial: las ejecuciones de sincronización, leídas de la
 * fila-reporte durable (no de BullMQ). Polling de 3 s mientras haya un run
 * vivo; tras ~2 min se ofrece el botón manual (patrón del import de imágenes).
 */
export function RunsTab({ integrationId }: { integrationId: string }) {
  const [runs, setRuns] = useState<SyncRunDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await listIntegrationRuns(integrationId);
      setRuns(res.items);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "No se pudo cargar el historial"));
    }
  }, [integrationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasActive = runs !== null && runs.some(isRunActive);
  const { stalled, resume } = useSyncRunsPolling(hasActive, load);

  if (error !== null) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw aria-hidden="true" className="size-4" />
          Reintentar
        </Button>
      </div>
    );
  }

  if (runs === null) return <Skeleton className="h-48 rounded-lg" />;

  if (runs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Todavía no corre ninguna sincronización. Lánzala desde la pestaña Estado.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {stalled && (
        <div className="flex items-center gap-3 rounded-md border border-border p-3">
          <p className="flex-1 text-sm text-muted-foreground">
            La sincronización sigue en marcha; dejamos de refrescar solos.
          </p>
          <Button variant="outline" size="sm" onClick={() => void resume()}>
            <RefreshCw aria-hidden="true" className="size-4" />
            Actualizar
          </Button>
        </div>
      )}

      <ol className="space-y-2.5">
        {runs.map((run) => (
          <RunRow key={run.id} run={run} />
        ))}
      </ol>
    </div>
  );
}

const KIND_LABELS: Record<string, string> = {
  backfill: "Sincronización completa",
  delta: "Actualización",
  reconcile: "Reconciliación",
};

const TRIGGER_LABELS: Record<string, string> = {
  manual: "manual",
  install: "al conectar",
  schedule: "programada",
  webhook: "por aviso de la tienda",
};

function RunRow({ run }: { run: SyncRunDTO }) {
  const active = isRunActive(run);
  const failed = run.status === "failed";
  const partial = run.status === "partial";
  const counters = run.counters;
  const applied = counters.products_created + counters.products_updated;

  return (
    <li
      className={cn(
        "space-y-2 rounded-lg border p-4",
        failed ? "border-destructive/40" : partial ? "border-warning/40" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {active && (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-muted-foreground" />
        )}
        <p className="font-medium">
          {KIND_LABELS[run.kind] ?? run.kind}
          <span className="text-muted-foreground"> · {TRIGGER_LABELS[run.trigger] ?? run.trigger}</span>
        </p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            failed
              ? "bg-destructive/12 text-destructive"
              : partial
                ? "bg-warning/12 text-warning"
                : active
                  ? "bg-secondary text-muted-foreground"
                  : "bg-success/12 text-success",
          )}
        >
          {SYNC_PHASE_LABELS[run.phase]}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          <RelativeDate iso={run.created_at} />
        </span>
      </div>

      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
        <Counter label="revisados" value={counters.products_seen} total={run.products_total} />
        <Counter label="aplicados" value={applied} />
        <Counter label="sin cambios" value={counters.products_skipped} />
        {counters.deactivated_count > 0 && (
          <Counter label="dados de baja" value={counters.deactivated_count} />
        )}
        {counters.images_queued > 0 && (
          <Counter label="imágenes en cola" value={counters.images_queued} />
        )}
        {counters.error_count > 0 && (
          <span className="font-medium text-destructive">{counters.error_count} con error</span>
        )}
      </dl>

      {run.error !== null && (
        <p className={cn("text-sm", failed ? "text-destructive" : "text-warning")}>{run.error}</p>
      )}
    </li>
  );
}

function Counter({ label, value, total }: { label: string; value: number; total?: number | null }) {
  return (
    <span>
      <span className="font-medium text-foreground">
        {value}
        {typeof total === "number" ? `/${total}` : ""}
      </span>{" "}
      {label}
    </span>
  );
}
