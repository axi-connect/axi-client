/**
 * Variables públicas de entorno — única fuente de URLs del backend.
 * Solo valores estrictamente públicos (`NEXT_PUBLIC_*` se filtra al bundle).
 */

/** Origen del backend axi-server (sin prefijo de API). */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

/** Prefijo global + versión del API REST del backend. */
export const API_PREFIX = "/api/v1";

/** Origen del WebSocket (Socket.IO, path default `/socket.io`, namespaces `/inbox` y `/channels`). */
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || "http://localhost:3000";

/* ──────────────────── WhatsApp comercial de axi ───────────────────── */

/**
 * Celular colombiano de 10 dígitos (mercado del producto). Mismo criterio que
 * `axi-server/src/core/system/kernel/phone.ts`: un `3XXXXXXXXX` dictado sin
 * indicativo no es un país inexistente, es Colombia.
 */
const CO_MOBILE = /^3\d{9}$/;
/** E.164 sin el '+': lo que `wa.me` espera en la ruta. */
const E164_DIGITS = /^\d{7,15}$/;

/**
 * Único punto donde se resuelve el número comercial. Tolera cómo se escriba en
 * el `.env` (`+57 322 497 0950`, `573224970950`, `322-497-0950`) y siempre
 * devuelve dígitos con indicativo.
 *
 * Falla en carga a propósito: las `NEXT_PUBLIC_*` se hornean en el bundle en
 * tiempo de build, así que una variable ausente no da error en ningún sitio —
 * simplemente deja la app en producción sin ningún CTA de ventas, en silencio.
 * Eso ya pasó. Mejor que reviente el build.
 */
function resolveSalesWhatsApp(): string {
  const raw = process.env.NEXT_PUBLIC_SALES_WHATSAPP;
  const digits = (raw ?? "").replace(/\D/g, "");

  if (digits.length === 0) {
    throw new Error(
      "Falta NEXT_PUBLIC_SALES_WHATSAPP. Es obligatoria: de ella cuelgan los CTA " +
        "de la landing, la tarjeta de /contacto y los avisos del trial. " +
        "Formato: dígitos con indicativo de país, p.ej. 573224970950.",
    );
  }

  const normalized = CO_MOBILE.test(digits) ? `57${digits}` : digits;
  if (!E164_DIGITS.test(normalized)) {
    throw new Error(
      `NEXT_PUBLIC_SALES_WHATSAPP="${raw}" no es un número E.164 plausible ` +
        "(7 a 15 dígitos con indicativo de país, p.ej. 573224970950).",
    );
  }
  return normalized;
}

/**
 * WhatsApp del equipo comercial de axi, en E.164 sin '+' (solo dígitos, con
 * indicativo). Fuente de verdad única: landing, /contacto, banner de
 * vencimiento del trial, pantalla de prueba finalizada y el checklist de
 * prerrequisitos de canales. axi vende por el canal que predica.
 */
export const SALES_WHATSAPP = resolveSalesWhatsApp();

/** Link `wa.me` al comercial, con mensaje prellenado si se le pasa uno. */
export function salesWhatsAppUrl(message?: string): string {
  const url = `https://wa.me/${SALES_WHATSAPP}`;
  return message ? `${url}?text=${encodeURIComponent(message)}` : url;
}

/**
 * El número tal como se muestra escrito: `573224970950` → `+57 322 497 0950`.
 * Fuera del patrón colombiano no se inventa agrupación, solo el '+'.
 */
export function formatSalesWhatsApp(): string {
  const co = /^57(3\d{2})(\d{3})(\d{4})$/.exec(SALES_WHATSAPP);
  return co ? `+57 ${co[1]} ${co[2]} ${co[3]}` : `+${SALES_WHATSAPP}`;
}
