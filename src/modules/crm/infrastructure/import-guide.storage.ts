import { IMPORT_GUIDE_SEEN_KEY } from "@/modules/crm/domain/import";

/**
 * Preferencia por navegador del check «No volver a mostrar» de la guía de
 * carga. `localStorage` puede no existir o lanzar (modo privado, datos
 * bloqueados): en ese caso la guía simplemente se muestra.
 */
export function readImportGuideSeen(): boolean {
  try {
    return window.localStorage.getItem(IMPORT_GUIDE_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeImportGuideSeen(seen: boolean): void {
  try {
    if (seen) window.localStorage.setItem(IMPORT_GUIDE_SEEN_KEY, "1");
    else window.localStorage.removeItem(IMPORT_GUIDE_SEEN_KEY);
  } catch {
    // sin persistencia: la guía volverá a salir
  }
}
