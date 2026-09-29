import type { PresetAudience } from "@/modules/marketing/domain/campaign-draft";

/**
 * Cómo viaja una audiencia decidida en el CRM hasta el asistente de campañas
 * (F6, auditoría C2).
 *
 * Una selección de la tabla puede tener miles de contactos (el lote admite
 * 5000) y la URL no: Node corta la cabecera en ~16 KB, unos 400 ids. La lista
 * se deja en `sessionStorage` bajo una clave de un solo uso y en la URL viaja
 * solo la clave (`?preset=…`). Un segmento o un import caben en la URL y van
 * por ahí, para que el enlace se pueda copiar.
 *
 * Funciones puras sobre un `Storage` (inyectado): así se prueban con una lista
 * de 5000 sin navegador.
 */
const PREFIX = "axi:campaign-preset:";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function stashPreset(storage: StorageLike, preset: PresetAudience): string {
  const key = randomKey();
  storage.setItem(PREFIX + key, JSON.stringify(preset));
  return key;
}

/** Lee la audiencia y la BORRA: la clave es de un solo uso. `null` si no está o no vale. */
export function takePreset(storage: StorageLike, key: string): PresetAudience | null {
  const raw = storage.getItem(PREFIX + key);
  if (raw === null) return null;
  storage.removeItem(PREFIX + key);
  try {
    const value: unknown = JSON.parse(raw);
    return isPreset(value) ? value : null;
  } catch {
    return null;
  }
}

function isPreset(value: unknown): value is PresetAudience {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.label !== "string") return false;
  if (v.mode === "contacts") return Array.isArray(v.contactIds) && v.contactIds.every((id) => typeof id === "string");
  if (v.mode === "import") return typeof v.importJobId === "string";
  if (v.mode === "segment") return typeof v.segmentId === "string";
  return false;
}

function randomKey(): string {
  const c = globalThis.crypto;
  if (c !== undefined && typeof c.randomUUID === "function") return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
