import { http } from "@/core/services/http";
import type {
  CollectionsSetupDTO,
  DocumentsSetupDTO,
  FxSetupDTO,
} from "@/modules/companies/domain/cobros-setup";

/**
 * Las lecturas de ajustes que dicen si cada función de cobros ya está
 * configurada (Cobros premium P1). Son los mismos GET que usan sus pestañas;
 * se piden aquí por ruta para no importar otros slices.
 */
export function getCollectionsSetup(): Promise<CollectionsSetupDTO> {
  return http.get<CollectionsSetupDTO>("/collections/settings");
}

export function getFxSetup(): Promise<FxSetupDTO> {
  return http.get<FxSetupDTO>("/fx/settings");
}

export function getDocumentsSetup(): Promise<DocumentsSetupDTO> {
  return http.get<DocumentsSetupDTO>("/documents/settings");
}
