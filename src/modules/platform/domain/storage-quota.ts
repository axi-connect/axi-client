/**
 * Almacenamiento incluido de un plan (Control de almacenamiento, D8).
 * El backend guarda BYTES de espacio ocupado; la UI habla en GB (GiB, como el
 * disco) con coma decimal. `null` = sin tope. TypeScript puro.
 */
export const GIB = 1024 ** 3;

/** Atajos del formulario (los escalones sembrados de los paquetes). */
export const STORAGE_QUOTA_PRESETS_GB = [5, 15, 40, 150] as const;

export function bytesToGb(bytes: number | null | undefined): number | null {
  if (bytes === null || bytes === undefined) return null;
  return Math.round((bytes / GIB) * 10) / 10;
}

export function gbToBytes(gb: number | null): number | null {
  if (gb === null) return null;
  return Math.round(gb * GIB);
}

/** «15 GB», «1,5 GB», «512 MB» o «Sin límite». */
export function formatQuota(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return "Sin límite";
  if (bytes < GIB) return `${Math.round(bytes / 1024 ** 2)} MB`;
  const gb = Math.round((bytes / GIB) * 10) / 10;
  return `${String(gb).replace(".", ",")} GB`;
}

/** Texto del input → GB. Vacío = sin tope; acepta coma decimal; `undefined` = inválido. */
export function parseQuotaInput(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(value) || value < 0 || value > 100 * 1024) return undefined;
  return Math.round(value * 10) / 10;
}
