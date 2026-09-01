import type { Schemas } from "@/core/api/types";

export type ProviderAccount = Schemas["ProviderAccountDto"];
export type ProviderCatalogEntry =
  Schemas["ProviderCatalogDto"]["data"][number];
export type ProviderCredentials = Schemas["CreateProviderDto"]["credentials"];
export type ProviderName = ProviderAccount["provider"];
export type CredentialMode = ProviderCatalogEntry["credential_mode"];

/**
 * Descriptor de cada proveedor en el idioma del operador.
 *
 * Calcado del registro de la tienda de integraciones: el dato de qué CAMPOS
 * pide cada credencial vive aquí, así que dar de alta un proveedor nuevo es
 * añadir una entrada y no escribir una pantalla.
 */
export interface ProviderDescriptor {
  label: string;
  tagline: string;
  /** Lo que hay que hacer ANTES de venir a pegar la llave. */
  prerequisites: string[];
  /** Los campos del formulario, en orden. */
  fields: CredentialField[];
  /** Aviso de costo o de plan, cuando lo hay. */
  note?: string;
}

export interface CredentialField {
  /** El `id` ES el nombre en el DTO: así el payload se arma sin un switch. */
  id: string;
  label: string;
  hint?: string;
  secret: boolean;
}

export const PROVIDER_DESCRIPTORS: Record<ProviderName, ProviderDescriptor> = {
  millionverifier: {
    label: "MillionVerifier",
    tagline: "Confirma que un buzón de correo existe de verdad",
    prerequisites: [
      "Crea una cuenta en millionverifier.com (100 créditos gratis, sin tarjeta)",
      "Copia la API key desde el panel de tu cuenta",
    ],
    fields: [{ id: "api_key", label: "API key", secret: true }],
    note: "La llave viaja en la URL de cada consulta, así que nunca se escribe en los registros del sistema.",
  },
  twilio_lookup: {
    label: "Twilio Lookup",
    tagline: "Dice si un número es móvil, fijo o virtual, y si está activo",
    prerequisites: [
      "En la consola de Twilio: Account → API keys & tokens → Create API key (tipo Standard)",
      "Copia el SID (empieza por SK) y el secreto — el secreto se muestra una sola vez",
    ],
    fields: [
      {
        id: "key_sid",
        label: "SID de la API Key",
        hint: "Empieza por SK",
        secret: false,
      },
      { id: "secret", label: "Secreto", secret: true },
    ],
    note: "Usa una API Key, no el Auth Token maestro: si se filtra, se revoca sola sin tumbar el resto de tu cuenta. Cada consulta cuesta unos 0,008 USD.",
  },
  rues: {
    label: "RUES · Cámaras de Comercio",
    tagline: "NIT, razón social y actividad registrada de empresas colombianas",
    prerequisites: ["Nada: es una fuente pública"],
    fields: [],
    note: "Gratis y sin credenciales. Va primero en la cascada para que resuelva lo que pueda antes de que un proveedor de pago cobre por lo mismo.",
  },
  apollo: {
    label: "Apollo",
    tagline: "Datos de personas y empresas por sector, cargo y tamaño",
    prerequisites: [
      "Regístrate en apollo.io con un correo corporativo (el plan gratuito lo exige)",
      "Genera la API key desde el panel de desarrollador — hace falta ser admin",
    ],
    fields: [{ id: "api_key", label: "API key", secret: true }],
    note: "Cobra 1 crédito por datos de contacto, pero 9 si devuelve un móvil. Por eso el teléfono viene apagado por defecto.",
  },
  overpass: {
    label: "OpenStreetMap",
    tagline: "Busca negocios por categoría y zona en el mapa libre",
    prerequisites: ["Nada: es una base de datos abierta"],
    fields: [],
    note: "Gratis y sin llave: no consume la cuota de nadie. Trae menos negocios que Google y casi nunca el correo — enciéndelo junto al extractor de sitios, que es quien completa el contacto.",
  },
  nominatim: {
    label: "Nominatim · OpenStreetMap",
    tagline: "Completa dirección, ciudad y país a partir de las coordenadas",
    prerequisites: ["Nada: es una fuente pública"],
    fields: [],
    note: "Gratis y sin llave. Comparte el límite de una petición por segundo con la búsqueda de ubicaciones del formulario, así que su ritmo no depende de cuántas cuentas tengas.",
  },
  site_extractor: {
    label: "Extractor de sitios",
    tagline: "Saca correo, teléfono y redes de la web del propio lead",
    prerequisites: ["Nada: lo hacemos nosotros"],
    fields: [],
    note: "Gratis. Es lo que convierte un nombre en un lead con el que se puede hacer algo, porque ninguna fuente de mapas entrega correo. Va delante de Firecrawl para que solo se pague cuando esto no encuentre nada.",
  },
  google_places: {
    label: "Google Maps",
    tagline: "El catálogo de negocios más completo de Colombia",
    prerequisites: [
      "Crea un proyecto en Google Cloud y habilita «Places API (New)»",
      "Activa la facturación del proyecto: sin ella la llave existe pero no responde",
      "Crea una clave de API y restríngela a Places API",
    ],
    fields: [{ id: "api_key", label: "Clave de API", secret: true }],
    note: "Unos 32 USD por cada 1.000 llamadas. No devuelve correo por diseño de Google: da el sitio web y de ahí lo saca el extractor.",
  },
  serper: {
    label: "Serper · buscador",
    tagline: "Encuentra al negocio que está en la web pero en ningún mapa",
    prerequisites: ["Regístrate en serper.dev y copia la API key del panel"],
    fields: [{ id: "api_key", label: "API key", secret: true }],
    note: "Cerca de 1 USD por cada 1.000 búsquedas: la fuente de pago más barata. Devuelve dominios, no fichas — el contacto lo completa el extractor.",
  },
  firecrawl: {
    label: "Firecrawl",
    tagline: "Extrae datos de páginas que el extractor propio no puede leer",
    prerequisites: ["Regístrate en firecrawl.dev y copia la API key"],
    fields: [{ id: "api_key", label: "API key", secret: true }],
    note: "Una página, un crédito, encuentre algo o no. Ponlo con prioridad MÁS ALTA que el extractor propio para que solo cobre cuando lo gratis ya falló.",
  },
};

/** Etiquetas de capacidad para la vitrina. */
export const CAPABILITY_LABELS: Record<string, string> = {
  verify_email: "Verifica correos",
  verify_phone: "Verifica teléfonos",
  identity_lookup: "Confirma identidad",
  enrich_person: "Datos de personas",
  enrich_company: "Datos de empresas",
  discover: "Busca negocios",
  extract_site: "Lee sitios web",
  geocode: "Ubica direcciones",
};

/**
 * El estado que se le muestra al operador de un vistazo.
 *
 * «Sin llave» es un estado real y distinto de «apagado»: una cuenta puede
 * existir sin credencial —porque se revocó— y eso no se ve mirando el
 * interruptor.
 */
export type ProviderStatus =
  | "active"
  | "disabled"
  | "unhealthy"
  | "no_credential"
  | "capped_day"
  | "capped_month";

/** Los que no piden llave se reconocen por no tener campos que pedir. */
function needsCredential(provider: ProviderName): boolean {
  return PROVIDER_DESCRIPTORS[provider].fields.length > 0;
}

export function providerStatus(account: ProviderAccount): ProviderStatus {
  // Antes se preguntaba `provider !== "rues"`, y F4 trajo dos fuentes sin llave
  // más: una lista de excepciones escrita a mano habría dejado a Overpass
  // eternamente «sin llave» aunque estuviera funcionando.
  if (account.token_last4 === null && needsCredential(account.provider))
    return "no_credential";
  if (!account.enabled) return "disabled";
  if (!account.healthy) return "unhealthy";
  if (account.daily_cap !== null && account.spent_today >= account.daily_cap)
    return "capped_day";
  // El mensual se distingue del diario porque el remedio es distinto: uno se
  // arregla mañana, el otro hay que subirlo o esperar al mes que viene. Y es el
  // que guarda el cupo gratuito de Places, que se cuenta por mes.
  if (account.monthly_cap !== null && account.spent_cycle >= account.monthly_cap)
    return "capped_month";
  return "active";
}

export const PROVIDER_STATUS_LABELS: Record<ProviderStatus, string> = {
  active: "Activo",
  disabled: "Apagado",
  unhealthy: "Con problemas",
  no_credential: "Sin llave",
  capped_day: "Tope diario alcanzado",
  capped_month: "Tope mensual alcanzado",
};

/** Construye el cuerpo de la credencial desde los campos del formulario. */
export function buildCredentials(
  mode: CredentialMode,
  values: Record<string, string>,
): ProviderCredentials {
  if (mode === "none") return { mode: "none" };
  if (mode === "key_secret") {
    return {
      mode: "key_secret",
      key_sid: values.key_sid ?? "",
      secret: values.secret ?? "",
    };
  }
  return { mode: "api_key", api_key: values.api_key ?? "" };
}
