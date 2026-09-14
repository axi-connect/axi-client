import type { Schemas } from "@/core/api/types";

/**
 * Contratos del import de contactos (`/crm/imports`, CSV o XLSX) —
 * procesamiento asíncrono con job + reporte. Espejo TIPADO del registro del
 * backend (`axi-server/src/modules/crm/application/imports/contact_import_columns.ts`):
 * si allí cambia una columna, cambia aquí en el mismo PR.
 */

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

/* ─────────────────────────────── Archivo ─────────────────────────────── */

export const IMPORT_ACCEPTED_EXTENSIONS = [".csv", ".xlsx"] as const;

/** Valor del atributo `accept` del input de archivo. */
export const IMPORT_ACCEPT_ATTRIBUTE = [
  ...IMPORT_ACCEPTED_EXTENSIONS,
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
].join(",");

/**
 * `null` si el archivo sirve; si no, el motivo en español. Valida por extensión
 * y tamaño: el tipo REAL lo decide el backend por los primeros bytes.
 */
export function validateImportFile(file: { name: string; size: number }): string | null {
  const dot = file.name.lastIndexOf(".");
  const extension = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
  if (!(IMPORT_ACCEPTED_EXTENSIONS as readonly string[]).includes(extension)) {
    return "El archivo debe ser CSV o XLSX. Si aún no tienes tu base en ese formato, descarga la plantilla.";
  }
  if (file.size === 0) return "El archivo está vacío.";
  if (file.size > IMPORT_MAX_BYTES) {
    return "El archivo pesa más de 10 MB. Divide la base en varios archivos.";
  }
  return null;
}

/** «48 KB», «1,2 MB» (es-CO). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("es-CO", { maximumFractionDigits: 1 })} MB`;
}

/* ─────────────────────────── Columnas (guía) ─────────────────────────── */

/** `one_of`: basta una de las marcadas así (teléfono o correo). */
export type ContactImportRequirement = "one_of" | "recommended" | "optional";

export interface ContactImportColumn {
  /** Cabecera tal como la escribe la plantilla. */
  header: string;
  requirement: ContactImportRequirement;
  /** Tipo que ve el usuario en la guía. */
  type: string;
  example: string;
}

export const CONTACT_IMPORT_COLUMNS: readonly ContactImportColumn[] = [
  { header: "nombre", requirement: "recommended", type: "Texto", example: "Laura" },
  { header: "apellido", requirement: "optional", type: "Texto", example: "Gómez" },
  { header: "telefono", requirement: "one_of", type: "Teléfono", example: "3001234567" },
  { header: "correo", requirement: "one_of", type: "Correo", example: "laura@correo.com" },
  { header: "ciudad", requirement: "optional", type: "Texto", example: "Bogotá" },
  { header: "direccion", requirement: "optional", type: "Texto", example: "Cra 7 # 45-10" },
  { header: "etapa", requirement: "optional", type: "Lista", example: "prospecto · lead · cliente · otro" },
];

export const IMPORT_REQUIREMENT_LABELS: Record<ContactImportRequirement, string> = {
  one_of: "Requerida*",
  recommended: "Recomendada",
  optional: "Opcional",
};

/** Clave de `localStorage` del check «No volver a mostrar» de la guía. */
export const IMPORT_GUIDE_SEEN_KEY = "axi.crm.import_guide_seen";

/* ────────────────────────────── Estado del job ────────────────────────────── */

/** Estado terminal del job: deja de hacer polling. */
export function isImportDone(status: ImportJobStatus): boolean {
  return status === "completed" || status === "failed";
}
