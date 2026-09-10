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

/**
 * Alta por OAuth (PR8): pide la URL de autorización y la vista navega hacia el
 * proveedor. Hoy ningún proveedor `oauth` está `available`, así que el camino
 * queda inerte detrás de las tarjetas `coming_soon`.
 */
export function startIntegrationOAuth(kind: string): Promise<{ authorize_url: string }> {
  return http.post<{ authorize_url: string }>(`/integrations/oauth/${kind}/authorize`);
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
 * Colecciones curadas (D5): el ORDEN del array es la prioridad. Responde 200
 * con el set guardado; si el catálogo ya está espejado, el backend relanza una
 * sincronización que aplica las categorías (se sigue en Historial).
 */
export function updateIntegrationCollections(
  id: string,
  selected: string[],
): Promise<Schemas["IntegrationCollectionsDto"]> {
  return http.put<Schemas["IntegrationCollectionsDto"]>(`/integrations/${id}/collections`, {
    selected,
  });
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

/**
 * Espejos ligeros (plan envíos+promos §4). «Actualizar desde Shopify»: el de
 * envíos responde con el resumen ya aplicado; el de promociones ENCOLA (lo
 * escribe marketing desde el companion) y devuelve el resumen al terminar.
 */
export function refreshIntegrationShipping(
  id: string,
): Promise<Schemas["ShippingMirrorRefreshDto"]> {
  return http.post<Schemas["ShippingMirrorRefreshDto"]>(`/integrations/${id}/shipping/refresh`);
}

export function refreshIntegrationDiscounts(
  id: string,
): Promise<Schemas["DiscountsMirrorRefreshDto"]> {
  return http.post<Schemas["DiscountsMirrorRefreshDto"]>(`/integrations/${id}/discounts/refresh`);
}
