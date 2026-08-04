"use client";

/**
 * Detalle de una ejecución EN VIVO: `useRunQuery` pollea cada 3 s mientras
 * siga en vuelo (pausado con re-login). Acciones según estado: Cancelar
 * (pending|running, confirmación simple) y Purgar datos (terminales,
 * `ConfirmTyped` — destruye transcripts/evaluaciones del tenant). Banner
 * cuando ya está purgada; recordatorio de retención automática (14 días).
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CircleSlash, Play, Trash2 } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { DataTable } from "@/shared/components/features/data-table";
import { TableSkeleton } from "@/shared/components/features/loading";
import {
  isRunCancelable,
  isRunPurgeable,
  RUN_RETENTION_DAYS,
} from "../../../../../domain/quality-runs";
import {
  useCancelRun,
  usePurgeRun,
  useRunQuery,
} from "../../../../../infrastructure/api/hooks/use-quality-runs";
import { ConfirmTyped } from "../../../../components/ConfirmTyped";
import { EmptyState } from "../../../../components/EmptyState";
import { ProblemAlert } from "../../../../components/ProblemAlert";
import { StatusBadge } from "../../../../components/StatusBadge";
import { aiModeLabel, runKindLabel, runScopeLabel } from "../runs-format";
import { buildCaseColumns, toCaseRow } from "./cases-table.config";
import { RunMetricsPanel } from "./RunMetricsPanel";
import { RunSummaryCards } from "./RunSummaryCards";

export function RunDetailView({ runId }: { runId: string }) {
  const { showAlert } = useAlert();
  const runQuery = useRunQuery(runId);
  const cancelRun = useCancelRun();
  const purgeRun = usePurgeRun();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [casesPage, setCasesPage] = useState(1);

  const run = runQuery.data;
  const columns = useMemo(() => buildCaseColumns(runId), [runId]);
  const rows = useMemo(() => (run?.cases ?? []).map(toCaseRow), [run?.cases]);

  if (runQuery.isPending) return <TableSkeleton rows={6} />;
  if (runQuery.isError) {
    return <ProblemAlert error={runQuery.error} onRetry={() => void runQuery.refetch()} />;
  }
  if (!run) return null;

  const mode = aiModeLabel(run.ai_mode);

  async function cancel() {
    try {
      await cancelRun.mutateAsync(runId);
      setCancelOpen(false);
      showAlert({
        tone: "success",
        title: "Ejecución cancelada",
        description: "Los cases en cola quedan bloqueados; los que corrían se cortan en ≤1 turno.",
        autoCloseMs: 5000,
      });
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo cancelar", description: errorMessage(error) });
    }
  }

  async function purge() {
    try {
      await purgeRun.mutateAsync(runId);
      setPurgeOpen(false);
      showAlert({
        tone: "success",
        title: "Purga iniciada",
        description: "El borrado corre por lotes; el estado pasará a Purgada al terminar.",
        autoCloseMs: 5000,
      });
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo purgar", description: errorMessage(error) });
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/platform/quality/runs"
          prefetch={false}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Ejecuciones
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={
                  run.kind === "stress"
                    ? "border-accent-amber/40 bg-accent-amber/10 text-accent-amber"
                    : "border-border text-muted-foreground"
                }
              >
                {runKindLabel(run.kind)}
              </Badge>
              {mode && <span className="text-xs text-muted-foreground">{mode}</span>}
              <h2 className="text-xl font-semibold tracking-tight">{run.company_name}</h2>
              <StatusBadge status={run.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {run.target_agent
                ? `Agente: ${run.target_agent.name} · ${run.target_agent.model} · ${run.target_agent.provider}`
                : "Agente: —"}
              {run.suite && (
                <>
                  {" "}
                  · Suite: <span className="font-mono text-xs">{run.suite.code}</span>
                </>
              )}
              {" "}· Alcance: <span className="font-mono text-xs">{runScopeLabel(run)}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isRunCancelable(run.status) && (
              <Button variant="outline" onClick={() => setCancelOpen(true)}>
                <CircleSlash aria-hidden="true" />
                Cancelar
              </Button>
            )}
            {isRunPurgeable(run.status) && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setPurgeOpen(true)}
              >
                <Trash2 aria-hidden="true" />
                Purgar datos
              </Button>
            )}
          </div>
        </div>

        {run.error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {run.error}
          </p>
        )}

        {run.status === "purged" && (
          <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            Datos sintéticos eliminados: los transcripts y evaluaciones de los cases ya no están
            disponibles. Las ejecuciones se purgan automáticamente a los {RUN_RETENTION_DAYS} días.
          </p>
        )}
      </div>

      <RunSummaryCards run={run} />
      <RunMetricsPanel run={run} />

      <section className="space-y-3">
        <h3 className="text-base font-semibold">Casos</h3>
        {rows.length === 0 ? (
          <EmptyState
            icon={Play}
            title="Sin cases todavía"
            description="La ejecución está encolando su trabajo; esta vista se actualiza sola."
          />
        ) : (
          <DataTable
            data={rows}
            columns={columns}
            pagination={{ page: casesPage, pageSize: 25 }}
            onPageChange={setCasesPage}
            preferredSearchFields={["scenario_code", "scenario_name"]}
            messages={{ empty: "Ningún case coincide con la búsqueda." }}
          />
        )}
      </section>

      <Modal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        config={{
          title: "Cancelar esta ejecución",
          description:
            "Se detiene la ejecución; los datos generados hasta ahora se conservan (puedes purgarlos después).",
          actions: [
            { label: "Volver", variant: "outline", asClose: true },
            {
              label: cancelRun.isPending ? "Cancelando…" : "Cancelar ejecución",
              onClick: () => void cancel(),
            },
          ],
        }}
      />

      <ConfirmTyped
        open={purgeOpen}
        onOpenChange={setPurgeOpen}
        title="Purgar los datos sintéticos"
        description={
          <>
            <p>
              Elimina del tenant <strong>{run.company_name}</strong> las conversaciones, mensajes y
              contactos sintéticos de esta ejecución. Los transcripts y evaluaciones de los cases
              dejarán de estar disponibles.
            </p>
            <p>Los resultados agregados (checks, scores, métricas) se conservan. Esta acción no se puede deshacer.</p>
          </>
        }
        confirmText={run.company_name}
        actionLabel="Purgar datos"
        onConfirm={purge}
        pending={purgeRun.isPending}
      />
    </div>
  );
}
