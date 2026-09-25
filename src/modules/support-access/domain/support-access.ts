/**
 * Acceso de soporte (entrega F3), lado de la pestaña de soporte. TypeScript
 * puro: el código de traspaso, el tiempo que queda y el copy de cada desenlace.
 */

/** El código de traspaso (32 bytes en base64url) llega como `#code=…`. */
export function readHandoffCode(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  const code = new URLSearchParams(raw).get("code");
  if (!code) return null;
  return /^[A-Za-z0-9_-]{32,128}$/.test(code) ? code : null;
}

/**
 * Pantallas del panel a las que puede entrar la pestaña de soporte tras el
 * canje (`#code=…&next=/ruta`). Solo prefijos internos conocidos: lo demás cae
 * en el panel de inicio. Es la defensa contra el open redirect.
 */
export const SUPPORT_NEXT_PREFIXES = [
  "/dashboard",
  "/admin/agents",
  "/settings/company",
  "/settings/payments",
  "/catalog",
  "/scheduling",
  "/workspace",
  "/crm",
  "/orders",
] as const

export const SUPPORT_DEFAULT_NEXT = "/dashboard"

/**
 * `next` del hash → una ruta interna segura, o `/dashboard`. Exige que empiece
 * por `/` y no por `//` ni `/\`, sin esquema; que resuelta contra el origen
 * siga en el MISMO origen; y que su ruta esté en la lista blanca.
 */
export function safeSupportNext(next: string | null | undefined, origin: string): string {
  if (typeof next !== "string" || next === "") return SUPPORT_DEFAULT_NEXT
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return SUPPORT_DEFAULT_NEXT
  if (/[\\\u0000-\u001f]/.test(next)) return SUPPORT_DEFAULT_NEXT
  let url: URL
  try {
    url = new URL(next, origin)
  } catch {
    return SUPPORT_DEFAULT_NEXT
  }
  if (url.origin !== new URL(origin).origin) return SUPPORT_DEFAULT_NEXT
  const allowed = SUPPORT_NEXT_PREFIXES.some(
    (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
  )
  return allowed ? `${url.pathname}${url.search}` : SUPPORT_DEFAULT_NEXT
}

/** El `next` que viene junto al código en el `#`. */
export function readHandoffNext(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash
  return raw ? new URLSearchParams(raw).get("next") : null
}

/** Minutos que quedan, redondeados hacia arriba (58:10 → «quedan 59 min»). 0 = terminó. */
export function minutesLeft(expiresAt: string, now: number = Date.now()): number {
  const ms = new Date(expiresAt).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.ceil(ms / 60_000);
}

export type RedeemFailure =
  | "conflict"
  | "invalid"
  | "no_platform_session"
  | "busy"
  | "unavailable";

/** Qué salió mal al canjear, según el status y el code del BFF. */
export function redeemFailure(status: number, code: string | undefined): RedeemFailure {
  if (code === "auth/support_session_conflict") return "conflict";
  if (status === 410 || code === "auth/support_handoff_invalid") return "invalid";
  if (status === 401 || status === 403) return "no_platform_session";
  if (status === 429) return "busy";
  return "unavailable";
}

export const REDEEM_FAILURE_COPY: Record<RedeemFailure, { title: string; body: string }> = {
  conflict: {
    title: "Ya hay una sesión de cliente en este navegador",
    body: "Ya tienes una sesión de cliente abierta en este navegador. Abre una ventana privada o cierra esa sesión.",
  },
  invalid: {
    title: "El código de soporte ya no es válido",
    body: "Dura 60 segundos y sirve una sola vez. Vuelve a la consola y entra como soporte de nuevo.",
  },
  no_platform_session: {
    title: "Entra desde la consola de plataforma",
    body: "Esta pestaña se abre desde «Entrar como soporte», con tu sesión de plataforma vigente en este navegador.",
  },
  busy: {
    title: "Demasiados intentos",
    body: "Espera un minuto y vuelve a entrar desde la consola.",
  },
  unavailable: {
    title: "No pudimos abrir la sesión de soporte",
    body: "El servidor no respondió. Vuelve a intentarlo desde la consola en un momento.",
  },
};

/** El toast de una acción que soporte no puede hacer (copy de la maqueta F0). */
export const SUPPORT_FORBIDDEN_COPY = {
  title: "No disponible en soporte",
  description: "Los usuarios, la facturación y los pagos no se pueden cambiar desde una sesión de soporte.",
} as const;

export const SUPPORT_READONLY_COPY = {
  title: "Cuenta suspendida: solo lectura, sin tiempo real",
  description: "Puedes revisar la cuenta, pero no cambiar nada ni recibir mensajes en vivo.",
} as const;
