import type { ConnectIntegrationDTO, IntegrationProviderKind } from "./integration";

/**
 * Registry de proveedores de integración (F17 PR7, generalizado en F8), calcado
 * de `channels/domain/channel-providers.ts`: TypeScript puro, sin React ni http.
 * `icon_id` y `brand_class` son IDENTIFICADORES que la capa `ui/` resuelve
 * contra diccionarios cerrados — Tailwind v4 extrae clases estáticamente y
 * `domain/` no puede traer JSX (§3.3 regla 1 del backend, espejo aquí).
 *
 * Desde F8 el descriptor no dice solo CÓMO se llama el proveedor sino CÓMO se
 * conecta: los campos de credenciales viven aquí como datos, y la vista genera
 * el formulario desde el descriptor en vez de hardcodear tres inputs de
 * Shopify. Añadir un proveedor por token es añadir una entrada, no una vista.
 */

/**
 * Kinds que el frontend conoce. Es un SUPERCONJUNTO del enum generado del
 * backend: la vitrina puede mostrar proveedores (Salesforce, HubSpot) cuya alta
 * el backend todavía no acepta — su descriptor es `coming_soon` y jamás llega a
 * un payload.
 */
export type KnownIntegrationKind = IntegrationProviderKind | "salesforce" | "hubspot";

export type IntegrationIconId = "shopify" | "mercado_pago" | "webhook" | "salesforce" | "hubspot";

/** Clases de resplandor del conjunto cerrado de `globals.css`. */
export type IntegrationBrandClass =
  | "brand-shopify"
  | "brand-mercadopago"
  | "brand-salesforce"
  | "brand-hubspot"
  | "brand-fault";

/**
 * `internal` es una costura técnica (el webhook genérico): existe en el
 * contrato pero no es un producto que un tenant elija, así que no se lista.
 */
export type IntegrationAvailability = "available" | "coming_soon" | "internal";

/** Cómo se conecta. `oauth` llega con la app de axi (PR8). */
export type IntegrationConnectStrategy = "access_token" | "oauth";

export type IntegrationCapabilityId =
  | "catalog"
  | "inventory"
  | "orders"
  | "payments"
  | "contacts"
  | "messages"
  | "deals";

/**
 * Un campo del formulario de credenciales, como DATOS. El `id` de cada campo de
 * `credential_fields` DEBE ser el nombre del campo en el DTO de la unión
 * (`access_token`/`api_secret` o `client_id`/`client_secret`): es lo que
 * permite que `buildConnectPayload` arme el payload sin un switch por proveedor.
 */
export type CredentialFieldSpec = {
  id: string;
  label: string;
  hint: string;
  placeholder: string;
  /** `true` pinta el input como password. */
  secret?: boolean;
  /** Validación PURA (sin red): devuelve el mensaje o `null` si pasa. */
  validate?: (value: string) => string | null;
};

export type AccessTokenConnectConfig = {
  strategy: "access_token";
  /** Qué variante de la unión `credentials` del DTO arma este proveedor. */
  credentials_mode: "access_token" | "client_credentials";
  /** El identificador de la cuenta remota → `ConnectIntegrationDTO.external_account`. */
  external_account_field: CredentialFieldSpec;
  credential_fields: readonly CredentialFieldSpec[];
};

export type OAuthConnectConfig = {
  strategy: "oauth";
  /** Nota corta sobre los permisos que se pedirán al autorizar. */
  scopes_note?: string;
};

export type IntegrationConnectConfig = AccessTokenConnectConfig | OAuthConnectConfig;

/**
 * El sustantivo con el que el usuario nombra SU lado de la conexión («tu
 * tienda», «tu cuenta»). Los copys del wizard y del detalle se generan de aquí:
 * nada de «tienda» fijo en las vistas.
 */
export type IntegrationNoun = { singular: string; gender: "f" | "m" };

export type IntegrationPrerequisite = {
  id: string;
  label: string;
  /** El detalle que evita descubrir el bloqueo dentro del admin del proveedor. */
  detail: string;
  critical?: boolean;
};

export type IntegrationProviderDescriptor = {
  /**
   * `string` y no `KnownIntegrationKind` a propósito: el `FALLBACK_PROVIDER`
   * representa kinds que este build no conoce. El registry sigue siendo total
   * sobre los conocidos vía `satisfies` más abajo.
   */
  kind: string;
  label: string;
  tagline: string;
  icon_id: IntegrationIconId;
  brand_class: IntegrationBrandClass;
  connect: IntegrationConnectConfig;
  availability: IntegrationAvailability;
  capabilities: readonly IntegrationCapabilityId[];
  noun: IntegrationNoun;
  /** Se muestra primero y con distintivo. Solo uno debería llevarlo. */
  recommended?: boolean;
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
      "Instalar la app requiere permisos de propietario. Si la tienda la maneja otra persona, pídele que haga este paso contigo.",
  },
  {
    id: "dev_app_created",
    label: "Creé la app «axi» en el Dev Dashboard de Shopify (dev.shopify.com)",
    detail:
      "Entra con la misma cuenta de la tienda, crea una app y ábrela: en «Configuración» están los permisos y en «Credenciales» el ID y el secreto de cliente.",
  },
  {
    id: "scopes_marked",
    label: "Marqué los 5 permisos de Admin API que axi necesita",
    detail:
      "read_products, read_inventory, read_locations, read_orders y write_draft_orders. Ni uno más: axi no pide datos de tus clientes. Si los cambias después, hay que reinstalar la app en la tienda.",
  },
  {
    id: "app_installed",
    label: "Instalé la app en mi tienda y tengo a mano el ID y el secreto de cliente",
    detail:
      "Sin instalarla, Shopify rechaza las credenciales aunque sean correctas. El secreto de cliente (shpss_…) también firma los avisos que tu tienda nos envía: si lo regeneras, vuelve aquí y rota las credenciales.",
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
 * El formulario de Shopify, como datos. Modo `client_credentials` (app del Dev
 * Dashboard): el par id/secreto es lo duradero y el backend acuña el token de
 * 24 h — es el camino que Shopify ofrece hoy para una app nueva, y el que se
 * verificó contra la tienda real de Savage. Son TRES campos y no uno (hallazgo
 * M7 de la auditoría): el id autentica y el secreto firma los webhooks.
 *
 * `validate` es pura (sin red) y corta antes del round-trip los dos errores de
 * pegado más comunes: el dominio público en vez del `.myshopify.com` y un
 * secreto a medio copiar.
 */

/** Acepta lo que el comerciante suele pegar (con https://, mayúsculas, barra final). */
export function validateShopDomain(value: string): string | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(normalized)
    ? null
    : "Usa el dominio .myshopify.com de tu tienda (Configuración → Dominios), no tu página pública.";
}
const SHOPIFY_CONNECT: AccessTokenConnectConfig = {
  strategy: "access_token",
  credentials_mode: "client_credentials",
  external_account_field: {
    id: "shop_domain",
    label: "Dominio de tu tienda",
    hint: "El dominio .myshopify.com, no el de tu página pública. Está en Configuración → Dominios.",
    placeholder: "mi-tienda.myshopify.com",
    validate: validateShopDomain,
  },
  credential_fields: [
    {
      id: "client_id",
      label: "ID de cliente",
      hint: "En el Dev Dashboard de Shopify → tu app → Credenciales. Identifica la app; no es secreto.",
      placeholder: "ID de cliente de la app",
      validate: (value) =>
        value.trim().length >= 10
          ? null
          : "El ID de cliente parece incompleto: cópialo entero desde Credenciales.",
    },
    {
      id: "client_secret",
      label: "Secreto de cliente",
      hint: "En la misma pantalla de Credenciales. Firma los avisos que tu tienda nos envía: sin él no llegan los cambios de stock.",
      placeholder: "shpss_…",
      secret: true,
      validate: (value) =>
        value.trim().length >= 10
          ? null
          : "El secreto de cliente parece incompleto: cópialo entero desde Credenciales.",
    },
  ],
};

/**
 * Un descriptor por proveedor conocido. Los `coming_soon` se muestran a
 * propósito: comunicar la hoja de ruta es información comercial útil, y la
 * tarjeta inerte evita el "¿y mis pagos?" en cada demo. `generic_webhook` es
 * `internal`: es una costura técnica, no un producto que un tenant elija.
 */
export const INTEGRATION_PROVIDERS = {
  shopify: {
    kind: "shopify",
    label: "Shopify",
    tagline:
      "Tu catálogo y tu inventario se espejan solos, y los pedidos del agente se cobran en tu checkout de Shopify.",
    icon_id: "shopify",
    brand_class: "brand-shopify",
    connect: SHOPIFY_CONNECT,
    availability: "available",
    capabilities: ["catalog", "inventory", "orders"],
    noun: { singular: "tienda", gender: "f" },
    recommended: true,
    requirement_note: "Necesitas crear una app en tu admin de Shopify · unos 10 minutos",
    prerequisites: SHOPIFY_PREREQUISITES,
  },
  mercado_pago: {
    kind: "mercado_pago",
    label: "Mercado Pago",
    tagline: "Cobros con link de pago directamente en la conversación.",
    icon_id: "mercado_pago",
    brand_class: "brand-mercadopago",
    connect: { strategy: "oauth" },
    availability: "coming_soon",
    capabilities: ["payments"],
    noun: { singular: "cuenta", gender: "f" },
    requirement_note: "Próximamente",
    prerequisites: [],
  },
  generic_webhook: {
    kind: "generic_webhook",
    label: "Webhook genérico",
    tagline: "Costura técnica para sistemas propios. No se conecta desde aquí.",
    icon_id: "webhook",
    brand_class: "brand-fault",
    // `internal` lo excluye de la galería y de todo camino de alta; la
    // estrategia declarada es irrelevante mientras eso se cumpla.
    connect: { strategy: "oauth" },
    availability: "internal",
    capabilities: [],
    noun: { singular: "sistema", gender: "m" },
    prerequisites: [],
  },
  salesforce: {
    kind: "salesforce",
    label: "Salesforce",
    tagline:
      "Tus contactos y oportunidades del CRM, sincronizados con las conversaciones del agente.",
    icon_id: "salesforce",
    brand_class: "brand-salesforce",
    connect: { strategy: "oauth" },
    // El flip a `available` es cambiar ESTA línea cuando el backend tenga su
    // alta OAuth (PR8): la tarjeta, el wizard y el callback ya saben pintarlo.
    availability: "coming_soon",
    capabilities: ["contacts", "messages", "deals"],
    noun: { singular: "cuenta", gender: "f" },
    requirement_note: "Próximamente",
    prerequisites: [],
  },
  hubspot: {
    kind: "hubspot",
    label: "HubSpot",
    tagline:
      "Tus contactos y negocios de HubSpot, al alcance del agente y actualizados en ambos sentidos.",
    icon_id: "hubspot",
    brand_class: "brand-hubspot",
    connect: { strategy: "oauth" },
    // El flip a `available` es cambiar ESTA línea cuando el backend tenga su
    // alta OAuth (PR8): la tarjeta, el wizard y el callback ya saben pintarlo.
    availability: "coming_soon",
    capabilities: ["contacts", "messages", "deals"],
    noun: { singular: "cuenta", gender: "f" },
    requirement_note: "Próximamente",
    prerequisites: [],
  },
} as const satisfies Record<KnownIntegrationKind, IntegrationProviderDescriptor>;

/**
 * Descriptor de emergencia para un kind que este build no conoce (p. ej. el
 * backend estrenó un proveedor antes que el frontend). Neutro y `internal`:
 * la conexión existente se pinta sin romper y no se ofrece ningún alta.
 */
export const FALLBACK_PROVIDER: IntegrationProviderDescriptor = {
  kind: "unknown",
  label: "Integración externa",
  tagline: "Proveedor que esta versión del panel todavía no conoce.",
  icon_id: "webhook",
  brand_class: "brand-fault",
  connect: { strategy: "oauth" },
  availability: "internal",
  capabilities: [],
  noun: { singular: "cuenta", gender: "f" },
  prerequisites: [],
};

/** Descriptor de un kind. Nunca devuelve `undefined`: lo desconocido cae al fallback. */
export function integrationProvider(kind: string): IntegrationProviderDescriptor {
  if (kind in INTEGRATION_PROVIDERS) {
    return INTEGRATION_PROVIDERS[kind as KnownIntegrationKind];
  }
  return FALLBACK_PROVIDER;
}

/**
 * Proveedores visibles en la galería, DERIVADOS del registry (no una lista
 * escrita a mano): sin los `internal`, el recomendado primero, los conectables
 * antes que la hoja de ruta, y orden de declaración como desempate estable.
 */
export function visibleProviders(): readonly IntegrationProviderDescriptor[] {
  const rank = (provider: IntegrationProviderDescriptor): number => {
    if (provider.recommended === true) return 0;
    return provider.availability === "available" ? 1 : 2;
  };
  return Object.values(INTEGRATION_PROVIDERS)
    .filter((provider) => provider.availability !== "internal")
    .sort((a, b) => rank(a) - rank(b));
}

/**
 * Por dónde va el alta HOY. Espejo de `effectiveConnectStrategy` de canales:
 * la decisión vive en `domain/`, no como un `if` en la vista.
 */
export function effectiveConnectStrategy(
  provider: IntegrationProviderDescriptor,
): IntegrationConnectStrategy {
  return provider.connect.strategy;
}

/**
 * Arma el payload del alta desde los valores del formulario generado. El cast
 * a la unión generada del DTO se LOCALIZA aquí: los kinds que no existen en el
 * backend (Salesforce, HubSpot) van por `oauth` y jamás llegan a esta función.
 */
export function buildConnectPayload(
  config: AccessTokenConnectConfig,
  kind: string,
  values: Record<string, string>,
): ConnectIntegrationDTO {
  return {
    provider: kind as IntegrationProviderKind,
    external_account: (values[config.external_account_field.id] ?? "").trim(),
    credentials: buildRotatePayload(config, values),
  };
}

/** La variante de la unión `credentials` del DTO, según el modo del descriptor. */
export function buildRotatePayload(
  config: AccessTokenConnectConfig,
  values: Record<string, string>,
): ConnectIntegrationDTO["credentials"] {
  const value = (id: string): string => (values[id] ?? "").trim();
  if (config.credentials_mode === "client_credentials") {
    return {
      mode: "client_credentials",
      client_id: value("client_id"),
      client_secret: value("client_secret"),
    };
  }
  return {
    mode: "access_token",
    access_token: value("access_token"),
    api_secret: value("api_secret"),
  };
}

/* ------------------------- Copys generados por noun ------------------------
 * Cada helper produce, para Shopify, EXACTAMENTE la frase que el wizard tenía
 * fija antes de F8 («Conecta tu tienda de Shopify», «Conectar tienda», …). */

/** «tu tienda» / «tu cuenta», el sintagma que nombra el lado del usuario. */
function noun(provider: IntegrationProviderDescriptor): string {
  return provider.noun.singular;
}

/** «conectada»/«conectado» según el género del noun. */
export function connectedWord(provider: IntegrationProviderDescriptor): string {
  return provider.noun.gender === "f" ? "conectada" : "conectado";
}

export function connectTitle(provider: IntegrationProviderDescriptor): string {
  return `Conecta tu ${noun(provider)} de ${provider.label}`;
}

export function prerequisitesSubtitle(provider: IntegrationProviderDescriptor): string {
  return `Estos pasos se hacen una sola vez en el admin de tu ${noun(provider)}. Si algo falta, es mejor saberlo ahora.`;
}

export function connectSubtitle(provider: IntegrationProviderDescriptor): string {
  if (provider.connect.strategy === "oauth") {
    return `Autorizas el acceso desde ${provider.label} y vuelves aquí, sin pegar tokens.`;
  }
  return `Validamos las credenciales contra tu ${noun(provider)} antes de guardar nada.`;
}

export function successSubtitle(provider: IntegrationProviderDescriptor): string {
  return `Tu ${noun(provider)} quedó ${connectedWord(provider)}. Falta decirle a axi qué sincronizar.`;
}

export function connectCtaLabel(provider: IntegrationProviderDescriptor): string {
  return `Conectar ${noun(provider)}`;
}

export function connectingLabel(provider: IntegrationProviderDescriptor): string {
  return `Validando con tu ${noun(provider)}…`;
}

export function connectErrorFallback(provider: IntegrationProviderDescriptor): string {
  const article = provider.noun.gender === "f" ? "la" : "el";
  return `No se pudo conectar ${article} ${noun(provider)}`;
}

/** Etiquetas de capacidades para los chips de las tarjetas. */
export const CAPABILITY_LABELS: Record<IntegrationCapabilityId, string> = {
  catalog: "Catálogo",
  inventory: "Inventario",
  orders: "Pedidos",
  payments: "Pagos",
  contacts: "Contactos",
  messages: "Mensajes",
  deals: "Negocios",
};
