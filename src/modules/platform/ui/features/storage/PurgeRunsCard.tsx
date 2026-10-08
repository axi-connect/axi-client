"use client";

/** Historial de depuración del tenant (manuales, retención y janitor). */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { files, formatBytes, PURGE_KIND_TITLES, type PurgeRun } from "../../../domain/storage";
import { usePurgeRuns } from "../../../infrastructure/api/hooks/use-storage";
import { TileFailure } from "./parts";

const STATUS: Record<string, string> = {
  queued: "En cola",
  running: "Eliminando…",
  done: "Hecha",
  partial: "Con fallos",
  failed: "Falló",
};

function who(run: PurgeRun): string {
  if (run.executed_by === "system:retention") return "Retención automática";
  if (run.executed_by === "system:janitor") return "Limpieza automática";
  return "Platform";
}

export function PurgeRunsCard({ tenantId }: { tenantId: string }) {
  const query = usePurgeRuns(tenantId);
  if (query.isError) return <TileFailure label="Historial de depuración" onRetry={() => void query.refetch()} />;
  const runs = query.data ?? [];
  return (
    <section className="@container min-w-0 overflow-hidden rounded-3xl border border-border bg-card" aria-label="Historial de depuración">
      <h2 className="border-b border-border/60 px-5 py-4 font-sans text-[15px] font-semibold tracking-normal">Historial de depuración</h2>
      {runs.length === 0 && !query.isPending ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">Aún no se ha depurado nada en este tenant.</p>
      ) : (
        <div className="axi-scroll overflow-x-auto">
          <Table className="min-w-[560px]">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Cuándo</TableHead>
                <TableHead>Qué</TableHead>
                <TableHead className="text-right">Liberado</TableHead>
                <TableHead className="hidden @xl:table-cell">Quién</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="pl-5 whitespace-nowrap text-muted-foreground">
                    {new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(run.executed_at ?? run.created_at))}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{PURGE_KIND_TITLES[run.kind] ?? run.kind}</span>
                    <span className="block text-xs text-muted-foreground">
                      {STATUS[run.status] ?? run.status} · {files(run.deleted_files)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatBytes(run.freed_bytes)}</TableCell>
                  <TableCell className="hidden text-muted-foreground @xl:table-cell">{who(run)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

