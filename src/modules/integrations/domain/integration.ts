import type { Schemas } from "@/core/api/types";

/**
 * Tipos del slice integrations (F17): alias del contrato generado, jamás
 * duplicados a mano — `npm run api:types` es la fuente de verdad.
 */
export type IntegrationDTO = Schemas["IntegrationDto"];
export type IntegrationsListDTO = Schemas["IntegrationsListDto"];
export type IntegrationStatus = IntegrationDTO["status"];
export type IntegrationProviderKind = IntegrationDTO["provider"];
export type GovernanceState = IntegrationsListDTO["governance"]["catalog"];
export type IntegrationGovernance = IntegrationsListDTO["governance"];

export type ConnectIntegrationDTO = Schemas["ConnectIntegrationDto"];
export type IntegrationLocationDTO = Schemas["IntegrationLocationsDto"]["items"][number];
export type IntegrationCollectionDTO = Schemas["IntegrationCollectionsDto"]["items"][number];
export type SyncRunDTO = Schemas["SyncRunsListDto"]["items"][number];

/** Etiquetas del estado de la conexión, en el vocabulario del panel. */
export const INTEGRATION_STATUS_LABELS: Record<IntegrationStatus, string> = {
  pending_setup: "Configuración pendiente",
  connected: "Conectada",
  error: "Con problemas",
  disconnected: "Desconectada",
};

/** Etiquetas de la fase de una ejecución (el backend ya la deriva). */
export const SYNC_PHASE_LABELS: Record<SyncRunDTO["phase"], string> = {
  en_cola: "En cola",
  exportando: "Exportando desde la tienda",
  aplicando: "Aplicando al catálogo",
  terminado: "Terminado",
  con_errores: "Terminado con avisos",
  fallido: "Falló",
};

/** Una ejecución viva es la que justifica seguir haciendo polling. */
export function isRunActive(run: SyncRunDTO): boolean {
  return run.status === "queued" || run.status === "running";
}

/**
 * Cadencia del polling del historial (patrón `imageImportPollInterval` de
 * catalog): 3 s mientras haya un run vivo; a los ~2 min se declara `stalled`
 * para que la UI ofrezca el botón manual en vez de pollear para siempre.
 */
export function syncRunsPollInterval(hasActive: boolean, elapsedMs: number): number | false {
  if (!hasActive) return false;
  if (elapsedMs > 120_000) return false;
  return 3_000;
}
