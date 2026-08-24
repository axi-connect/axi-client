import type { IntegrationDTO } from "./integration";
import type {
  IntegrationCapabilityId,
  IntegrationProviderDescriptor,
} from "./integration-providers";

/**
 * Pestañas del detalle de una integración (F9): el detalle no hardcodea cinco
 * tabs de Shopify — se DERIVAN de las capacidades de la conexión. «Estado» e
 * «Historial» son el marco fijo (toda conexión tiene salud y ejecuciones);
 * lo demás aparece solo si la capacidad existe.
 */
export type IntegrationDetailTabId =
  | "estado"
  | "ubicaciones"
  | "categorias"
  | "pedidos"
  | "contactos"
  | "historial";

/** Qué pestaña abre cada capacidad. Las que no abren ninguna (payments,
 * messages, deals) se gestionan en Estado/Historial, no con un panel propio. */
const CAPABILITY_TAB: Partial<Record<IntegrationCapabilityId, IntegrationDetailTabId>> = {
  inventory: "ubicaciones",
  catalog: "categorias",
  orders: "pedidos",
  contacts: "contactos",
};

/** Orden canónico de las pestañas de capacidad, entre Estado e Historial. */
const CANONICAL_ORDER: readonly IntegrationDetailTabId[] = [
  "ubicaciones",
  "categorias",
  "pedidos",
  "contactos",
];

const KNOWN_CAPABILITIES = new Set<string>(Object.keys(CAPABILITY_TAB));

/**
 * Las pestañas a pintar: `["estado", ...capacidades efectivas, "historial"]`.
 *
 * Capacidades efectivas = `dto.capabilities` si trae algo (∩ conocidas: un
 * string que este build no conoce se IGNORA en vez de romper la vista); si el
 * backend no declaró ninguna, el fallback es lo que el descriptor promete.
 */
export function detailTabsFor(
  provider: IntegrationProviderDescriptor,
  dto: IntegrationDTO,
): readonly IntegrationDetailTabId[] {
  const effective: readonly string[] =
    dto.capabilities.length > 0 ? dto.capabilities : provider.capabilities;

  const tabs = new Set(
    effective
      .filter((capability) => KNOWN_CAPABILITIES.has(capability))
      .map((capability) => CAPABILITY_TAB[capability as IntegrationCapabilityId] as IntegrationDetailTabId),
  );

  return ["estado", ...CANONICAL_ORDER.filter((tab) => tabs.has(tab)), "historial"];
}
