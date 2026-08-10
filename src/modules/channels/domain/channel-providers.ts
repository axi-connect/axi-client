import type { ChannelKind } from "./channel";

/**
 * Registry de proveedores de canal (F1).
 *
 * TypeScript puro: sin React, sin `zod` y sin `http`, porque vive en `domain/`
 * y la regla 1 de `docs/architecture.md §3.3` lo exige. De aquí sale TODO lo
 * que la UI necesita saber de un canal, y por eso añadir Instagram en F5 es
 * cambiar un `availability` y no rediseñar una vista.
 *
 * Dos campos son identificadores y no valores, a propósito:
 *
 * - `icon_id` no puede ser un componente de React dentro de `domain/`. La capa
 *   `ui/` lo resuelve contra un diccionario cerrado, igual que el sidebar hace
 *   con `core/lib/icons.ts` (DESIGN-SYSTEM §9.2).
 * - `brand_class` es el nombre de una clase de un conjunto cerrado definido en
 *   `globals.css`, nunca un hex ni un token para interpolar. Tailwind v4 extrae
 *   las clases estáticamente del fuente: un `bg-[var(${provider.color})]` no
 *   genera nada. Es la misma trampa que DESIGN-SYSTEM §4.4 documenta para los
 *   z-index.
 */

/** Cómo se conecta el canal. `manual` es el escape hatch de soporte. */
export type ChannelConnectStrategy = "embedded_signup" | "qr" | "manual";

/** Iconos permitidos. El diccionario que los resuelve vive en `ui/`. */
export type ChannelIconId = "whatsapp" | "qr" | "instagram" | "messenger" | "robot";

/** Clases de resplandor definidas en `globals.css`. Conjunto cerrado. */
export type ChannelBrandClass =
  | "brand-whatsapp"
  | "brand-instagram"
  | "brand-messenger"
  | "brand-fault";

export type ChannelAvailability = "available" | "coming_soon" | "internal";

export type ChannelPrerequisite = {
  id: string;
  label: string;
  /** El detalle que evita que la persona descubra el bloqueo dentro de Meta. */
  detail: string;
  /** `true` pinta el aviso destacado: son los que más altas rompen. */
  critical?: boolean;
};

export type ChannelProvider = {
  kind: ChannelKind;
  label: string;
  tagline: string;
  icon_id: ChannelIconId;
  brand_class: ChannelBrandClass;
  connect_strategy: ChannelConnectStrategy;
  availability: ChannelAvailability;
  /** Se muestra primero y con distintivo. Solo uno debería llevarlo. */
  recommended?: boolean;
  /** Nota corta bajo el tagline: coste real de la elección. */
  requirement_note?: string;
  prerequisites: readonly ChannelPrerequisite[];
  /** Producto de Meta para `GET /channels/meta/embedded-signup/config?product=`. */
  meta_product?: "whatsapp" | "instagram" | "messenger";
};

/**
 * Prerrequisitos del alta de WhatsApp Cloud. No son burocracia: cada uno
 * corresponde a un modo de fallo real del onboarding, y el tercero es el que
 * más altas rompe — la persona descubre dentro del popup de Meta que su número
 * ya está en uso, que es donde el abandono es caro y el error incomprensible.
 */
const WHATSAPP_CLOUD_PREREQUISITES: readonly ChannelPrerequisite[] = [
  {
    id: "business_account_access",
    label: "Puedo entrar a la cuenta de Facebook que administra mi negocio",
    detail:
      "Es la cuenta con la que autorizarás la conexión. Si la maneja otra persona, pídele que haga este paso contigo.",
  },
  {
    id: "phone_reachable",
    label: "Tengo el número a mano y puedo recibir un SMS o una llamada",
    detail: "Meta te enviará un código para confirmar que el número es tuyo.",
  },
  {
    id: "phone_not_in_whatsapp",
    label: "Ese número no está usándose en WhatsApp ni en WhatsApp Business",
    detail:
      "Al conectarlo, ese número deja de funcionar en el celular. Sus chats pasan a atenderse desde Axi y no se pueden recuperar en la app de WhatsApp.",
    critical: true,
  },
  {
    id: "billing_understood",
    label: "Entiendo que Meta cobra los mensajes directamente a mi negocio",
    detail:
      "Axi no revende mensajes: tú pones tu método de pago en Meta y ellos te facturan lo que uses. Puedes conectar ahora y añadirlo después.",
  },
];

const WHATSAPP_WEB_PREREQUISITES: readonly ChannelPrerequisite[] = [
  {
    id: "phone_powered_on",
    label: "Tengo el celular a mano, encendido y con internet",
    detail:
      "La vinculación funciona como WhatsApp Web: si el celular se queda sin batería o sin datos, el canal deja de responder.",
    critical: true,
  },
];

/**
 * Un descriptor por cada `ChannelKind`. El test del registry comprueba que no
 * falte ninguno: un kind sin descriptor rompería la vista al pintarlo.
 */
export const CHANNEL_PROVIDERS: Readonly<Record<ChannelKind, ChannelProvider>> = {
  whatsapp_cloud: {
    kind: "whatsapp_cloud",
    label: "WhatsApp",
    tagline:
      "El canal oficial de negocio. Tu número queda en la nube de Meta, sin depender de un celular encendido.",
    icon_id: "whatsapp",
    brand_class: "brand-whatsapp",
    connect_strategy: "embedded_signup",
    availability: "available",
    recommended: true,
    requirement_note: "Se conecta con un botón · unos 2 minutos",
    prerequisites: WHATSAPP_CLOUD_PREREQUISITES,
    meta_product: "whatsapp",
  },
  whatsapp_web: {
    kind: "whatsapp_web",
    label: "WhatsApp con código QR",
    tagline:
      "Vinculas tu WhatsApp actual escaneando un código, como en WhatsApp Web. Útil para empezar rápido.",
    icon_id: "qr",
    brand_class: "brand-whatsapp",
    connect_strategy: "qr",
    availability: "available",
    requirement_note: "Necesita un celular encendido y con internet",
    prerequisites: WHATSAPP_WEB_PREREQUISITES,
  },
  instagram_dm: {
    kind: "instagram_dm",
    label: "Instagram",
    tagline: "Mensajes directos de tu cuenta profesional de Instagram.",
    icon_id: "instagram",
    brand_class: "brand-instagram",
    connect_strategy: "embedded_signup",
    // F5. El backend tiene adaptador de envío y webhook, pero NO el alta por
    // Embedded Signup: su verificación de propiedad usa `/me/accounts`, distinta
    // de la de WhatsApp. Sin esa verificación, el alta por botón sería el
    // agujero que B4 cerró.
    availability: "coming_soon",
    requirement_note: "Se conecta con el mismo botón",
    prerequisites: [],
    meta_product: "instagram",
  },
  facebook_messenger: {
    kind: "facebook_messenger",
    label: "Messenger",
    tagline: "Mensajes de la página de Facebook de tu negocio.",
    icon_id: "messenger",
    brand_class: "brand-messenger",
    connect_strategy: "embedded_signup",
    availability: "coming_soon",
    requirement_note: "Se conecta con el mismo botón",
    prerequisites: [],
    meta_product: "messenger",
  },
  simulator: {
    kind: "simulator",
    label: "Simulador (QA)",
    tagline: "Canal sintético del módulo de calidad. No se conecta desde aquí.",
    icon_id: "robot",
    brand_class: "brand-whatsapp",
    connect_strategy: "manual",
    // `internal` y no `coming_soon`: existe y funciona, pero lo crea plataforma
    availability: "internal",
    prerequisites: [],
  },
};

/** Descriptor de un kind. Nunca devuelve `undefined`: el record es total. */
export function channelProvider(kind: ChannelKind): ChannelProvider {
  return CHANNEL_PROVIDERS[kind];
}

/**
 * Proveedores que el tenant puede elegir, recomendados primero.
 *
 * Excluye los `internal`: el simulador es del módulo de calidad y ofrecerlo
 * aquí sería ofrecer un canal que no atiende a nadie.
 */
export function connectableProviders(): readonly ChannelProvider[] {
  return Object.values(CHANNEL_PROVIDERS)
    .filter((provider) => provider.availability !== "internal")
    .sort((a, b) => Number(b.recommended ?? false) - Number(a.recommended ?? false));
}
