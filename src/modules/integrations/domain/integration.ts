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
 * catalog): 3 s mientras haya un run vivo; a los 10 min se declara `stalled`
 * para que la UI ofrezca el botón manual en vez de pollear para siempre. Eran
 * 2 min, y el PRIMER backfill (bulk operation + descarga + aplicar + imágenes)
 * los supera con normalidad: el dueño veía «dejamos de refrescar» como fallo
 * justo en la sincronización que más importa.
 */
export const SYNC_RUNS_STALL_MS = 600_000;

export function syncRunsPollInterval(hasActive: boolean, elapsedMs: number): number | false {
  if (!hasActive) return false;
  if (elapsedMs > SYNC_RUNS_STALL_MS) return false;
  return 3_000;
}
