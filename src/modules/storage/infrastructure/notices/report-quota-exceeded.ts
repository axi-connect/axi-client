import { readQuotaExceeded, type QuotaExceededDetails } from "@/modules/storage/domain/quota";
import { useStorageStore } from "@/modules/storage/infrastructure/stores/storage.store";

/**
 * Señal del DOM (architecture §9, `familia:acción:estado`) con la que una
 * subida dice «el servidor respondió 507 por espacio lleno». La escucha el
 * vigía del layout (`StorageQuotaWatcher`), que es quien tiene a mano el
 * aviso, el permiso y el router: así el helper sirve igual desde un hook, un
 * store de módulo (la cola de fotos del catálogo) o un handler suelto, y no
 * obliga a nadie a montar proveedores.
 */
export const STORAGE_QUOTA_EXCEEDED_EVENT = "storage:quota:exceeded";

export type QuotaExceededSignal = { details: QuotaExceededDetails; fileName: string | null };

/**
 * Si `error` es el 507 `storage/quota_exceeded`: apaga las subidas en el
 * store, pide la píldora «No subimos «archivo»» y devuelve `true`. Si no lo
 * es, `false`, y el llamador sigue con su `errorMessage(err)` de siempre.
 */
export function reportQuotaExceeded(error: unknown, fileName?: string | null): boolean {
  const details = readQuotaExceeded(error);
  if (details === null) return false;
  useStorageStore.getState().onQuotaExceeded(details);
  if (typeof window !== "undefined") {
    const detail: QuotaExceededSignal = { details, fileName: fileName ?? null };
    window.dispatchEvent(new CustomEvent<QuotaExceededSignal>(STORAGE_QUOTA_EXCEEDED_EVENT, { detail }));
  }
  return true;
}
