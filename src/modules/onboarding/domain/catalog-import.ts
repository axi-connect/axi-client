/**
 * Import de catálogo con IA (paso «Catálogo» del onboarding). Dominio PURO:
 * tipos espejo del contrato B4 (`CatalogImportDto`, `CatalogImportItemDto`) y
 * las reglas que decide el frontend — qué archivo se acepta, cada cuánto se
 * pregunta por el job, qué fila está lista para crearse y cómo se lee la
 * confianza de la IA.
 *
 * Invariante: **la IA nunca inventa un precio**. Un item sin `price_cents` no se
 * crea; el usuario lo escribe o lo excluye. Aquí se calcula, en la UI se pinta.
 */

// CONTRACT: `Schemas["CatalogImportDto"]` / `["CatalogImportItemDto"]` en F7.
export type CatalogImportStatus =
  | "queued"
  | "parsing"
  | "extracting"
  | "review_required"
  | "committing"
  | "completed"
  | "failed"
  | "cancelled";

export type CatalogImportSourceKind = "sheet" | "pdf" | "image";

export type CatalogImportItemStatus = "ready" | "missing_fields" | "duplicate" | "excluded" | "committed" | "error";

export type ImportedVariant = {
  name: string;
  price_cents: number | null;
  attributes: Record<string, string>;
  sku?: string;
};

export type CatalogImportItemDTO = {
  id: string;
  position: number;
  status: CatalogImportItemStatus;
  name: string;
  description: string | null;
  price_cents: number | null;
  currency: string;
  category: string | null;
  kind: "product" | "service";
  duration_minutes: number | null;
  variants: ImportedVariant[];
  image_urls: string[];
  /** 0..1, la confianza de la IA en la fila completa. */
  confidence: number;
  /** «hoja Menú, fila 12» · «página 3» · «imagen, región superior». */
  source_ref: string;
  missing_fields: string[];
  duplicate_of_product_id: string | null;
  error: string | null;
};

export type CatalogImportDTO = {
  id: string;
  status: CatalogImportStatus;
  filename: string;
  mime_type: string;
  size_bytes: number;
  source_kind: CatalogImportSourceKind;
  pages_total: number | null;
  pages_processed: number;
  items_total: number;
  items_ready: number;
  items_missing_fields: number;
  items_excluded: number;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  error: { code: string; message: string } | null;
  ai_cost_usd: number | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  items?: CatalogImportItemDTO[];
};

export type CatalogImportItemPatchDTO = Partial<
  Pick<CatalogImportItemDTO, "name" | "description" | "price_cents" | "currency" | "category" | "kind" | "duration_minutes">
> & { status?: "ready" | "excluded" };

export type CommitCatalogImportDTO = {
  catalog_id?: string;
  create_categories: boolean;
  on_duplicate: "skip" | "update";
};

/* ─────────────────────────────── Archivo ─────────────────────────────── */

export const IMPORT_MAX_BYTES = 10 * 1024 * 1024;

/** Extensiones que lee el pipeline (B4): hojas, PDF con texto e imágenes. */
export const ACCEPTED_IMPORT_EXTENSIONS = [".xlsx", ".csv", ".pdf", ".png", ".jpg", ".jpeg", ".webp"] as const;

export const ACCEPTED_IMPORT_MIME = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

/** Valor del atributo `accept` del input de archivo. */
export const IMPORT_ACCEPT_ATTRIBUTE = [...ACCEPTED_IMPORT_EXTENSIONS, ...ACCEPTED_IMPORT_MIME].join(",");

/** `null` si el archivo sirve; si no, el motivo en español. Valida por extensión: el MIME lo decide el backend por magic bytes. */
export function validateImportFile(file: { name: string; size: number }): string | null {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!(ACCEPTED_IMPORT_EXTENSIONS as readonly string[]).includes(extension)) {
    return "Ese formato no lo leemos todavía. Sube un Excel (.xlsx), un CSV, un PDF con texto o una foto (JPG, PNG, WebP).";
  }
  if (file.size > IMPORT_MAX_BYTES) {
    return "El archivo pesa más de 10 MB. Divide el catálogo o comprime la imagen.";
  }
  if (file.size === 0) return "El archivo está vacío.";
  return null;
}

/* ────────────────────────────── Estado del job ────────────────────────────── */

export function isImportProcessing(status: CatalogImportStatus): boolean {
  return status === "queued" || status === "parsing" || status === "extracting" || status === "committing";
}

export function isImportTerminal(status: CatalogImportStatus): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

export const IMPORT_POLL_FAST_MS = 2_000;
export const IMPORT_POLL_SLOW_MS = 5_000;
/** Tras un minuto se pregunta menos; tras tres, se avisa de que tarda más de lo normal. */
export const IMPORT_POLL_SLOW_AFTER_MS = 60_000;
export const IMPORT_POLL_BUDGET_MS = 180_000;

/** Intervalo del siguiente sondeo según el tiempo transcurrido, o `false` si se agotó el presupuesto. */
export function importPollInterval(elapsedMs: number): number | false {
  if (elapsedMs >= IMPORT_POLL_BUDGET_MS) return false;
  return elapsedMs >= IMPORT_POLL_SLOW_AFTER_MS ? IMPORT_POLL_SLOW_MS : IMPORT_POLL_FAST_MS;
}

/** Texto de progreso para `role="status"`, derivado del job. */
export function importProgressLabel(job: CatalogImportDTO): string {
  switch (job.status) {
    case "queued":
      return "En cola…";
    case "parsing":
      return job.pages_total ? `Leyendo página ${job.pages_processed} de ${job.pages_total}` : "Leyendo el archivo…";
    case "extracting":
      return `${job.items_total} productos encontrados hasta ahora`;
    case "committing":
      return "Creando los productos…";
    case "review_required":
      return `${job.items_total} productos encontrados`;
    case "completed":
      return `Creamos ${job.created_count} productos`;
    case "failed":
      return "No pudimos leer el archivo";
    case "cancelled":
      return "Cancelado";
  }
}

/** 0..1 de avance para la barra; `null` cuando el job no informa páginas. */
export function importProgressRatio(job: CatalogImportDTO): number | null {
  if (job.status === "review_required" || isImportTerminal(job.status)) return 1;
  if (job.pages_total && job.pages_total > 0) return Math.min(1, job.pages_processed / job.pages_total);
  return null;
}

/* ──────────────────────────────── Revisión ──────────────────────────────── */

/** Cambios locales de una fila antes de enviarlos. `included: false` = excluir. */
export type ItemEdits = Partial<Pick<CatalogImportItemDTO, "name" | "price_cents" | "category" | "kind">> & {
  included?: boolean;
};

export type ReviewItem = CatalogImportItemDTO & { included: boolean };

/** Aplica los cambios locales a la fila del servidor. Excluido en servidor ⇒ no incluido, salvo que el usuario lo vuelva a marcar. */
export function applyEdits(item: CatalogImportItemDTO, edits: ItemEdits | undefined): ReviewItem {
  const included = edits?.included ?? (item.status !== "excluded" && item.status !== "duplicate");
  return {
    ...item,
    name: edits?.name ?? item.name,
    price_cents: edits?.price_cents === undefined ? item.price_cents : edits.price_cents,
    category: edits?.category === undefined ? item.category : edits.category,
    kind: edits?.kind ?? item.kind,
    included,
  };
}

/** Qué le falta a una fila para poder crearse (el nombre y el precio son obligatorios). */
export function missingFor(item: ReviewItem): string[] {
  const missing: string[] = [];
  if (!item.name.trim()) missing.push("name");
  if (item.price_cents === null || item.price_cents < 0) missing.push("price_cents");
  return missing;
}

export type ConfidenceTone = "ready" | "review" | "missing" | "duplicate" | "excluded";

/** Cómo se lee la fila: lista, para revisar (confianza baja), sin dato, duplicada o excluida. */
export function confidenceTone(item: ReviewItem): ConfidenceTone {
  if (!item.included) return "excluded";
  if (item.duplicate_of_product_id) return "duplicate";
  if (missingFor(item).length > 0) return "missing";
  if (item.confidence < 0.8) return "review";
  return "ready";
}

export const CONFIDENCE_LABELS: Record<ConfidenceTone, string> = {
  ready: "Listo",
  review: "Revisar",
  missing: "Falta precio",
  duplicate: "Ya existe",
  excluded: "Excluido",
};

/** Umbral por debajo del cual una celda se marca para revisar. */
export const LOW_CONFIDENCE = 0.8;

export type ReviewFilter = "all" | "needs_input" | "ready";

export function filterItems(items: readonly ReviewItem[], filter: ReviewFilter): ReviewItem[] {
  if (filter === "needs_input") return items.filter((item) => item.included && missingFor(item).length > 0);
  if (filter === "ready") return items.filter((item) => item.included && missingFor(item).length === 0);
  return [...items];
}

/** Filas incluidas a las que aún les falta un dato: bloquean el commit. */
export function reviewBlockers(items: readonly ReviewItem[]): ReviewItem[] {
  return items.filter((item) => item.included && missingFor(item).length > 0);
}

export function commitableCount(items: readonly ReviewItem[]): number {
  return items.filter((item) => item.included && missingFor(item).length === 0).length;
}

/** Excluye de un golpe lo incompleto: lo que quede, se crea. */
export function excludeIncomplete(items: readonly ReviewItem[], edits: Record<string, ItemEdits>): Record<string, ItemEdits> {
  const next = { ...edits };
  for (const item of reviewBlockers(items)) next[item.id] = { ...next[item.id], included: false };
  return next;
}

/** Los PATCH que hay que mandar antes del commit: solo lo que cambió respecto al servidor. */
export function patchesFor(
  items: readonly CatalogImportItemDTO[],
  edits: Record<string, ItemEdits>,
): Array<{ item_id: string; patch: CatalogImportItemPatchDTO }> {
  const patches: Array<{ item_id: string; patch: CatalogImportItemPatchDTO }> = [];
  for (const item of items) {
    const edit = edits[item.id];
    if (!edit) continue;
    const patch: CatalogImportItemPatchDTO = {};
    if (edit.name !== undefined && edit.name !== item.name) patch.name = edit.name;
    if (edit.price_cents !== undefined && edit.price_cents !== item.price_cents) patch.price_cents = edit.price_cents;
    if (edit.category !== undefined && edit.category !== item.category) patch.category = edit.category;
    if (edit.kind !== undefined && edit.kind !== item.kind) patch.kind = edit.kind;
    if (edit.included === false && item.status !== "excluded") patch.status = "excluded";
    if (edit.included === true && item.status === "excluded") patch.status = "ready";
    if (Object.keys(patch).length > 0) patches.push({ item_id: item.id, patch });
  }
  return patches;
}

export const DEFAULT_COMMIT: CommitCatalogImportDTO = { create_categories: true, on_duplicate: "skip" };
