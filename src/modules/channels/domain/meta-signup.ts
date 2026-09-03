import type { Schemas } from "@/core/api/types";

/**
 * Contratos del alta de canales Meta por Embedded Signup (F2).
 *
 * Los DTO salen de `Schemas[...]` y no se escriben a mano: el `openapi.json` del
 * backend es la fuente de verdad y `npm run api:types:check` lo vigila. Los
 * nombres NO son los que el plan proponía — el backend los llamó
 * `MetaSignupConfigDto` y `MetaEmbeddedSignupDto`.
 */
export type MetaSignupConfigDTO = Schemas["MetaSignupConfigDto"];
export type MetaEmbeddedSignupDTO = Schemas["MetaEmbeddedSignupDto"];
export type MetaRegisterPhoneDTO = Schemas["MetaRegisterPhoneDto"];

/** Producto de Meta. Es query param OBLIGATORIO del endpoint de configuración. */
export type MetaProduct = MetaSignupConfigDTO["product"];

/**
 * Las fases del flujo. Son DIEZ y no las nueve que listaba el plan: `awaiting_pin`
 * se añadió al descubrir que el backend devuelve 201 con
 * `onboarding.status === "awaiting_registration"` en vez de un 409, así que el
 * canal ya existe y hay un id con el que llamar al endpoint del PIN. El mockup
 * aprobado de F0 ya contemplaba esa pantalla.
 *
 * Una sola fase visible a la vez: el usuario no controla ninguna de las
 * transiciones, así que mostrarle dos es mentirle sobre dónde está.
 *
 * - `preparing`   cargando SDK y configuración
 * - `ready`       el botón se puede pulsar
 * - `unavailable` no hay SDK o la capacidad está apagada → camino manual
 * - `popup_open`  esperando que autorice en la ventana de Meta
 * - `popup_blocked` el navegador bloqueó la ventana
 * - `exchanging`  llegó el `code`, el backend está canjeando y activando
 * - `awaiting_pin` el canal existe pero el número necesita su PIN de registro
 * - `success`     canal conectado
 * - `cancelled`   cerró la ventana sin terminar
 * - `error`       falló con un código del backend
 */
export type EmbeddedSignupPhase =
  | "preparing"
  | "ready"
  | "unavailable"
  | "popup_open"
  | "popup_blocked"
  | "exchanging"
  /**
   * Solo en el alta por páginas (F7): el negocio autorizó varias y tiene que
   * elegir. WhatsApp nunca pasa por aquí — su popup ya devuelve el número.
   */
  | "choosing_asset"
  | "awaiting_pin"
  | "success"
  | "cancelled"
  | "error";

/** Fases con un intento en curso: el botón se bloquea y se anuncia el progreso. */
export const IN_PROGRESS_PHASES: readonly EmbeddedSignupPhase[] = [
  "preparing",
  "popup_open",
  "exchanging",
];

/**
 * Fases en las que el intento terminó sin canal. El foco vuelve al botón (o al
 * aviso) porque al cerrarse el popup estaba en una ventana que ya no existe.
 */
export const TERMINAL_PHASES: readonly EmbeddedSignupPhase[] = [
  "cancelled",
  "error",
  "popup_blocked",
  "unavailable",
];

/** Error del flujo: `code` RFC 7807 del backend, o un código local del cliente. */
export type SignupError = {
  code: string;
  message: string;
};

/**
 * Los dos errores que ambos flujos (WhatsApp y páginas) producen por su cuenta,
 * sin backend. Vivían como literales repetidos —tres copias de uno, dos del
 * otro— y una cuarta variante en `core/lib/error-messages.ts` que nadie usaba.
 * Un solo texto, alineado con el de ahí.
 */
export const SIGNUP_ERRORS = {
  disabled: {
    code: "channels/meta_signup_disabled",
    message:
      "La conexión automática con Meta no está disponible ahora mismo. Puedes usar el camino manual o intentarlo más tarde",
  },
  config_not_applied: {
    code: "meta/config_not_applied",
    message:
      "Meta no aplicó la configuración de conexión. Suele ser que el identificador de configuración no corresponde a la aplicación. Avísanos para revisarlo.",
  },
} as const satisfies Record<string, SignupError>;

/**
 * Sub-estado de DIAGNÓSTICO que devuelve el backend en `ChannelDto.onboarding`.
 * No es una segunda máquina de estados: la máquina sigue siendo `ChannelStatus`.
 * `awaiting_registration` es el único que obliga a la UI a pedir algo (el PIN).
 */
export type MetaOnboardingStatus =
  | "completed"
  | "awaiting_registration"
  | "awaiting_payment_method"
  | "failed";

/** Motivos por los que el SDK no está disponible. Cada uno tiene otra salida. */
export type FacebookSdkFailure =
  | "blocked" // bloqueador de anuncios o red corporativa: no cargó el script
  | "timeout" // cargó a medias o nunca resolvió
  | "no_app_id"; // la configuración del backend no trae app_id

export class FacebookSdkError extends Error {
  readonly reason: FacebookSdkFailure;

  constructor(reason: FacebookSdkFailure, message: string) {
    super(message);
    this.name = "FacebookSdkError";
    this.reason = reason;
  }
}

/**
 * Lo que el popup de Meta manda por `postMessage`. Solo se acepta
 * `type === "WA_EMBEDDED_SIGNUP"`; el resto de mensajes de la ventana se
 * ignoran sin ruido.
 */
export type WaEmbeddedSignupMessage = {
  type: "WA_EMBEDDED_SIGNUP";
  event: "FINISH" | "CANCEL" | "ERROR" | string;
  version?: number | string;
  data?: {
    phone_number_id?: string;
    waba_id?: string;
    business_id?: string;
    error_message?: string;
    current_step?: string;
  };
};

/**
 * Orígenes de los que se acepta un `message`, por IGUALDAD EXACTA.
 *
 * Nunca `origin.includes("facebook.com")`: eso deja pasar
 * `https://evilfacebook.com.attacker.io`, que es un dominio que cualquiera puede
 * registrar. La comparación exacta es la única segura y no cuesta nada.
 */
export const META_MESSAGE_ORIGINS: readonly string[] = [
  "https://www.facebook.com",
  "https://web.facebook.com",
  "https://business.facebook.com",
];

export function isTrustedMetaOrigin(origin: string): boolean {
  return META_MESSAGE_ORIGINS.includes(origin);
}

/**
 * Parsea un `MessageEvent.data` del popup. Tolerante a propósito: Meta manda
 * también mensajes internos con otras formas, y una excepción aquí abortaría el
 * flujo por un mensaje que no nos incumbe.
 */
export function parseWaSignupMessage(raw: unknown): WaEmbeddedSignupMessage | null {
  let payload: unknown = raw;
  if (typeof raw === "string") {
    try {
      payload = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof payload !== "object" || payload === null) return null;
  const candidate = payload as Partial<WaEmbeddedSignupMessage>;
  if (candidate.type !== "WA_EMBEDDED_SIGNUP") return null;
  if (typeof candidate.event !== "string") return null;
  return candidate as WaEmbeddedSignupMessage;
}

/**
 * Lo que el usuario va a ver DENTRO del popup, por producto. Saber cuánto falta
 * reduce el abandono, pero solo si es verdad: el indicador decía «Meta verifica
 * el número por SMS o llamada» también en Instagram y Messenger, donde no hay
 * número, ni SMS, ni verificación telefónica — hay página y elección de activo.
 * Se compartió lo que no era común.
 */
export const SIGNUP_STEPS: Record<MetaProduct, readonly string[]> = {
  whatsapp: [
    "Eliges el negocio y el número",
    "Meta verifica el número por SMS o llamada",
    "Aceptas los permisos",
    "Activamos el canal",
  ],
  instagram: [
    "Eliges el negocio y sus páginas de Facebook",
    "Aceptas los permisos",
    "Leemos las cuentas de Instagram vinculadas",
    "Eliges cuál conectar y la activamos",
  ],
  messenger: [
    "Eliges el negocio y sus páginas de Facebook",
    "Aceptas los permisos",
    "Leemos las páginas autorizadas",
    "Eliges cuál conectar y la activamos",
  ],
};

/** Qué paso está en curso según la fase. `exchanging` en páginas es «leemos». */
export function signupStepIndex(product: MetaProduct, phase: EmbeddedSignupPhase): number {
  if (phase !== "exchanging") return 0;
  return product === "whatsapp" ? 3 : 2;
}
