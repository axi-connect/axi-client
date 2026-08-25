/**
 * SUPERFICIE PÚBLICA del slice `integrations` (F17).
 *
 * Consumidores actuales: ninguno — el badge de origen del catálogo usa el
 * campo `governed_by_connection_id` del propio DTO de producto, no este slice.
 * El barrel existe desde el día uno para que el primer consumidor (p. ej. un
 * selector de proveedor en platform) no importe internals.
 */

export {
  INTEGRATION_STATUS_LABELS,
  type GovernanceState,
  type IntegrationDTO,
  type IntegrationProviderKind,
  type IntegrationStatus,
} from "./domain/integration";
export {
  CAPABILITY_LABELS,
  INTEGRATION_PROVIDERS,
  integrationProvider,
  type IntegrationProviderDescriptor,
} from "./domain/integration-providers";
