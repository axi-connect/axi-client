import type { IntegrationProviderKind } from "./integration";

/**
 * Registry de proveedores de integración (F17 PR7), calcado de
 * `channels/domain/channel-providers.ts`: TypeScript puro, sin React ni http.
 * `icon_id` y `brand_class` son IDENTIFICADORES que la capa `ui/` resuelve
 * contra diccionarios cerrados — Tailwind v4 extrae clases estáticamente y
 * `domain/` no puede traer JSX (§3.3 regla 1 del backend, espejo aquí).
 */

/** Cómo se conecta HOY. `oauth` llega con la app de axi (PR8). */
export type IntegrationConnectStrategy = "access_token" | "oauth" | "coming_soon";

export type IntegrationIconId = "shopify" | "mercado_pago" | "webhook";

/** Clases de resplandor del conjunto cerrado de `globals.css`. */
export type IntegrationBrandClass = "brand-shopify" | "brand-mercadopago" | "brand-fault";

export type IntegrationAvailability = "available" | "coming_soon";

export type IntegrationCapabilityId = "catalog" | "inventory" | "orders" | "payments";

export type IntegrationPrerequisite = {
  id: string;
  label: string;
  /** El detalle que evita descubrir el bloqueo dentro del admin del proveedor. */
  detail: string;
  critical?: boolean;
};

export type IntegrationProviderDescriptor = {
  kind: IntegrationProviderKind;
  label: string;
  tagline: string;
  icon_id: IntegrationIconId;
  brand_class: IntegrationBrandClass;
  connect_strategy: IntegrationConnectStrategy;
  availability: IntegrationAvailability;
  capabilities: readonly IntegrationCapabilityId[];
  /** Nota corta bajo el tagline: el coste real de la elección. */
  requirement_note?: string;
  prerequisites: readonly IntegrationPrerequisite[];
};

/**
 * Requisitos del alta de Shopify (D4, modo custom app + token). Cada punto es
 * un modo de fallo real del onboarding: el más caro es descubrir a mitad de
 * camino que el token se mostró UNA sola vez y ya se perdió.
 */
const SHOPIFY_PREREQUISITES: readonly IntegrationPrerequisite[] = [
  {
    id: "admin_access",
    label: "Puedo entrar al admin de mi tienda Shopify como propietario",
    detail:
      "Crear la app requiere permisos de propietario. Si la tienda la maneja otra persona, pídele que haga este paso contigo.",
  },
  {
    id: "custom_app_created",
    label: "Creé la app: Configuración → Aplicaciones y canales de ventas → Desarrollar aplicaciones",
    detail:
      'La primera vez Shopify pide "Permitir desarrollo de aplicaciones personalizadas". Crea una app llamada "axi".',
  },
  {
    id: "scopes_marked",
    label: "Marqué los 5 permisos de Admin API que axi necesita",
    detail:
      "read_products, read_inventory, read_locations, read_orders y write_draft_orders. Ni uno más: axi no pide datos de tus clientes.",
  },
  {
    id: "token_copied",
    label: "Instalé la app y copié el token de acceso Y la clave secreta de API",
    detail:
      "El token (shpat_…) se muestra UNA sola vez al instalar: cópialo antes de cerrar. La clave secreta de API está en la misma pestaña de credenciales y firma los avisos que Shopify nos envía.",
    critical: true,
  },
  {
    id: "currency_matches",
    label: "Mi tienda factura en la misma moneda que mi cuenta de axi",
    detail:
      "Si las monedas difieren, los precios del catálogo no se pueden convertir y la conexión se rechaza.",
  },
];

/**
 * Un descriptor por proveedor del contrato. Mercado Pago se muestra `coming_soon`
 * a propósito: comunicar la hoja de ruta es información comercial útil, y la
 * tarjeta inerte evita el "¿y mis pagos?" en cada demo. `generic_webhook` no se
 * lista: es una costura técnica, no un producto que un tenant elija.
 */
export const INTEGRATION_PROVIDERS: Readonly<
  Record<IntegrationProviderKind, IntegrationProviderDescriptor>
> = {
  shopify: {
    kind: "shopify",
    label: "Shopify",
    tagline:
      "Tu catálogo y tu inventario se espejan solos, y los pedidos del agente se cobran en tu checkout de Shopify.",
    icon_id: "shopify",
    brand_class: "brand-shopify",
    connect_strategy: "access_token",
    availability: "available",
    capabilities: ["catalog", "inventory", "orders"],
    requirement_note: "Necesitas crear una app en tu admin de Shopify · unos 10 minutos",
    prerequisites: SHOPIFY_PREREQUISITES,
  },
  mercado_pago: {
    kind: "mercado_pago",
    label: "Mercado Pago",
    tagline: "Cobros con link de pago directamente en la conversación.",
    icon_id: "mercado_pago",
    brand_class: "brand-mercadopago",
    connect_strategy: "coming_soon",
    availability: "coming_soon",
    capabilities: ["payments"],
    requirement_note: "Próximamente",
    prerequisites: [],
  },
  generic_webhook: {
    kind: "generic_webhook",
    label: "Webhook genérico",
    tagline: "Costura técnica para sistemas propios. No se conecta desde aquí.",
    icon_id: "webhook",
    brand_class: "brand-fault",
    connect_strategy: "coming_soon",
    availability: "coming_soon",
    capabilities: [],
    prerequisites: [],
  },
};

export function integrationProvider(
  kind: IntegrationProviderKind,
): IntegrationProviderDescriptor {
  return INTEGRATION_PROVIDERS[kind];
}

/** Proveedores visibles en la galería (los `coming_soon` se ven pero inertes). */
export function visibleProviders(): readonly IntegrationProviderDescriptor[] {
  return [INTEGRATION_PROVIDERS.shopify, INTEGRATION_PROVIDERS.mercado_pago];
}

/** Etiquetas de capacidades para los chips de las tarjetas. */
export const CAPABILITY_LABELS: Record<IntegrationCapabilityId, string> = {
  catalog: "Catálogo",
  inventory: "Inventario",
  orders: "Pedidos",
  payments: "Pagos",
};
