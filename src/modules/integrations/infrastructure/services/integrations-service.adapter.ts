import { http } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import type {
  ConnectIntegrationDTO,
  IntegrationDTO,
  IntegrationsListDTO,
} from "@/modules/integrations/domain/integration";

/** Adapter HTTP del slice integrations → `/integrations` (F17). */
export function listIntegrations(): Promise<IntegrationsListDTO> {
  return http.get<IntegrationsListDTO>("/integrations");
}

export function getIntegrationById(id: string): Promise<IntegrationDTO> {
  return http.get<IntegrationDTO>(`/integrations/${id}`);
}

/**
 * Alta sincrónica: valida contra el proveedor REAL antes de responder (regla 1
 * del contrato). Un 422 aquí es un token malo o permisos faltantes — el error
 * trae el detalle y el formulario lo muestra tal cual.
 */
export function connectIntegration(dto: ConnectIntegrationDTO): Promise<IntegrationDTO> {
  return http.post<IntegrationDTO>("/integrations", dto);
}

/** Rotación del token: también es la vía de recuperación tras un `error`. */
export function rotateIntegrationCredentials(
  id: string,
  credentials: ConnectIntegrationDTO["credentials"],
): Promise<void> {
  return http.put<void>(`/integrations/${id}/credentials`, { credentials });
}

/** Desconexión suave: el espejo queda congelado, nada se borra. */
export function disconnectIntegration(id: string): Promise<void> {
  return http.delete(`/integrations/${id}`);
}

export function listIntegrationLocations(
  id: string,
): Promise<Schemas["IntegrationLocationsDto"]> {
  return http.get<Schemas["IntegrationLocationsDto"]>(`/integrations/${id}/locations`);
}

/** Ubicaciones que SUMAN al stock (D6): la lista completa de ids marcados. */
export function updateIntegrationLocations(
  id: string,
  counting: string[],
): Promise<Schemas["IntegrationLocationsDto"]> {
  return http.put<Schemas["IntegrationLocationsDto"]>(`/integrations/${id}/locations`, {
    counting,
  });
}

export function listIntegrationCollections(
  id: string,
): Promise<Schemas["IntegrationCollectionsDto"]> {
  return http.get<Schemas["IntegrationCollectionsDto"]>(`/integrations/${id}/collections`);
}

/**
 * Colecciones curadas (D5): el ORDEN del array es la prioridad. Devuelve 202
 * con `run_id` — recategorizar exige re-recorrer el catálogo, y responder 200
 * haría que la UI dijera "guardado" mientras el agente ve la taxonomía vieja.
 */
export function updateIntegrationCollections(
  id: string,
  selected: string[],
): Promise<Schemas["SyncAcceptedDto"]> {
  return http.put<Schemas["SyncAcceptedDto"]>(`/integrations/${id}/collections`, { selected });
}

export function startIntegrationSync(
  id: string,
  kind: "backfill" | "reconcile",
): Promise<Schemas["SyncAcceptedDto"]> {
  return http.post<Schemas["SyncAcceptedDto"]>(`/integrations/${id}/sync`, { kind });
}

/** El progreso se lee de la fila-reporte durable, no de BullMQ. */
export function listIntegrationRuns(id: string): Promise<Schemas["SyncRunsListDto"]> {
  return http.get<Schemas["SyncRunsListDto"]>(`/integrations/${id}/runs`);
}
