"use client";

import { cn } from "@/core/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import {
  IMPORT_STATUS_LABELS,
  type ImportJobDTO,
  type ImportJobStatus,
} from "@/modules/crm/domain/import";

/** Estado del job como `Badge secondary` + punto (DESIGN-SYSTEM §2.2: el color es redundante). */
export function ImportStatusBadge({
  status,
  className,
}: {
  status: ImportJobStatus;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn("gap-1.5", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-full",
          status === "completed" && "bg-success",
          status === "failed" && "bg-destructive",
          (status === "processing" || status === "pending") && "bg-warning",
        )}
      />
      {IMPORT_STATUS_LABELS[status]}
    </Badge>
  );
}

const TILES: ReadonlyArray<{
  key: "created_count" | "updated_count" | "skipped_count" | "error_count";
  label: string;
  dot: string;
}> = [
  { key: "created_count", label: "Creados", dot: "bg-success" },
  { key: "updated_count", label: "Actualizados", dot: "bg-info" },
  { key: "skipped_count", label: "Omitidos · ya existían", dot: "bg-muted-foreground/50" },
  { key: "error_count", label: "Con errores", dot: "bg-destructive" },
];

/** Reporte del job: contadores + tabla de errores por fila (el backend guarda ≤100). */
export function ImportReport({ job }: { job: ImportJobDTO }) {
  const shown = job.errors.length;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TILES.map((tile) => (
          <div key={tile.key} className="rounded-xl border border-border bg-background px-3.5 py-3">
            <p className="font-heading text-2xl font-bold tracking-tight tabular-nums">
              {job[tile.key].toLocaleString("es-CO")}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span aria-hidden className={cn("size-1.5 rounded-full", tile.dot)} />
              {tile.label}
            </p>
          </div>
        ))}
      </div>
      {shown > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            Filas que no se importaron. Corrígelas en tu archivo y vuelve a subirlo: las que ya
            entraron se omiten solas.
          </p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Fila</th>
                  <th className="px-3 py-2 font-medium">Campo</th>
                  <th className="px-3 py-2 font-medium">Qué pasó</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {job.errors.map((error, index) => (
                  <tr key={`${error.row}-${index}`}>
                    <td className="px-3 py-1.5 font-mono tabular-nums">{error.row}</td>
                    <td className="px-3 py-1.5 font-mono text-muted-foreground">
                      {error.field ?? "—"}
                    </td>
                    <td className="px-3 py-1.5">{error.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {job.error_count > shown && (
            <p className="text-xs text-muted-foreground">
              Mostrando {shown} de {job.error_count} errores.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
