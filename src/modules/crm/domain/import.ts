import type { Schemas } from "@/core/api/types";

/** Contratos del import CSV (`/crm/imports`) — procesamiento asíncrono. */

export type ImportJobDTO = Schemas["ImportJobDto"];
export type ImportJobStatus = ImportJobDTO["status"];
export type ImportRowError = ImportJobDTO["errors"][number];

export type ImportOptions = {
  on_duplicate: "skip" | "update";
  tag_ids: string[];
  lifecycle_stage?: "prospect" | "lead" | "customer" | "other";
};

export const IMPORT_STATUS_LABELS: Record<ImportJobStatus, string> = {
  pending: "En cola",
  processing: "Procesando",
  completed: "Completado",
  failed: "Fallido",
};

export const IMPORT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const IMPORT_MAX_ROWS = 20_000;

/** Estado terminal del job: deja de hacer polling. */
export function isImportDone(status: ImportJobStatus): boolean {
  return status === "completed" || status === "failed";
}
