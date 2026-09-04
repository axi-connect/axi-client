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

/* ─────────────────── Origen público del sitio (SEO) ─────────────────── */

/**
 * Origen absoluto del sitio público, sin barra final: `https://axi-connect.co`.
 *
 * Falla en carga por la misma razón que `SALES_WHATSAPP` (§13.1 de
 * docs/architecture.md), y con consecuencias peores: de este valor cuelgan
 * `metadataBase`, los `canonical` de las doce rutas públicas, las URLs
 * absolutas de Open Graph, el sitemap y los `@id` del JSON-LD. Una
 * `NEXT_PUBLIC_*` ausente se hornea como `undefined` en el bundle sin error en
 * ningún sitio: el resultado sería un sitio en producción declarando que su
 * contenido canónico vive en `localhost`, sin ninguna señal. Ya pasó — era el
 * estado del repositorio antes de este módulo.
 */
function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!raw) {
    throw new Error(
      "Falta NEXT_PUBLIC_APP_URL. Es obligatoria: de ella cuelgan metadataBase, " +
        "los canonical, las URLs de Open Graph, el sitemap y el JSON-LD. " +
        "Formato: origen absoluto, p.ej. https://axi-connect.co",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_APP_URL="${raw}" no es una URL absoluta válida ` +
        "(debe incluir el esquema, p.ej. https://axi-connect.co).",
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `NEXT_PUBLIC_APP_URL="${raw}" debe usar http o https, no "${parsed.protocol}".`,
    );
  }

  // Sin barra final: todo el código de SEO concatena paths que ya empiezan por
  // '/', y `https://axi-connect.co//precios` sería una URL canónica distinta.
  return parsed.origin;
}

/** Origen público del sitio, sin barra final. Única fuente de verdad del dominio. */
export const SITE_URL = resolveSiteUrl();

/** URL absoluta del sitio para un path que empieza por '/'. */
export function siteUrl(path = "/"): string {
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

/* ────────────────────────────── Analítica ────────────────────────────── */

/**
 * Los identificadores de analítica degradan a `null` si faltan, al revés que
 * `SITE_URL`: un desarrollador que solo quiere levantar la landing no puede
 * quedarse sin build por no tener una propiedad de GA. Pero un id **mal
 * formado** sí lanza, porque es el peor de los dos mundos: aparenta estar
 * configurado y no mide nada, y nadie lo nota en meses.
 *
 * En GitHub Actions una Variable no definida llega como cadena VACÍA, no como
 * indefinida — de ahí el `trim()` antes de decidir.
 *
 * EL VALOR SE RECIBE COMO ARGUMENTO Y NO SE LEE AQUÍ, y esto no es estilo.
 * Next.js sustituye `process.env.NEXT_PUBLIC_FOO` por su literal al compilar,
 * pero SOLO cuando el acceso es estático: con una clave calculada
 * (`process.env[name]`) no hay nada que sustituir, y en el navegador queda un
 * objeto vacío. Esta función leía así, de modo que las tres constantes de
 * abajo valían `null` en el cliente por muy bien configurada que estuviera la
 * variable — el captcha nunca se montaba y la analítica nunca se cargaba.
 * El nombre se sigue pasando aparte porque el mensaje de error lo necesita.
 */
function resolveOptionalId(
  name: string,
  raw: string | undefined,
  pattern: RegExp,
  example: string,
): string | null {
  const value = raw?.trim();
  if (!value) return null;

  if (!pattern.test(value)) {
    throw new Error(
      `${name}="${value}" no tiene el formato esperado (p.ej. ${example}). ` +
        "Un id mal escrito se despliega sin medir nada y sin avisar: mejor que reviente el build.",
    );
  }
  return value;
}

/** Id de medición de GA4 (`G-XXXXXXX`), o `null` si no está configurado. */
export const GA_MEASUREMENT_ID = resolveOptionalId(
  "NEXT_PUBLIC_GA_ID",
  process.env.NEXT_PUBLIC_GA_ID,
  /^G-[A-Z0-9]{4,}$/,
  "G-ABC1234567",
);

/** Id del píxel de Meta (15-16 dígitos), o `null` si no está configurado. */
export const META_PIXEL_ID = resolveOptionalId(
  "NEXT_PUBLIC_META_PIXEL_ID",
  process.env.NEXT_PUBLIC_META_PIXEL_ID,
  /^\d{15,16}$/,
  "123456789012345",
);

/**
 * Clave PÚBLICA del widget de Cloudflare Turnstile del registro autoservicio
 * (`/comenzar`), o `null`: sin ella el widget no se monta y el backend valida
 * el alta con su verificador `noop`, que está prohibido en producción. Mismo
 * criterio que los ids de analítica — ausente degrada, mal formada aborta.
 *
 * El primer carácter distingue la familia, y por eso el patrón NO se limita a
 * `0x`: Cloudflare publica claves de prueba que funcionan en cualquier dominio
 * —`localhost` incluido— sin necesidad de cuenta, y son la forma sensata de
 * desarrollar contra el captcha de verdad. `0x` es una clave real; `1x` aprueba
 * siempre, `2x` rechaza siempre y `3x` fuerza el desafío interactivo.
 */
export const TURNSTILE_SITE_KEY = resolveOptionalId(
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  /^[0-3]x[0-9A-Za-z_-]{8,}$/,
  "0x4AAAAAAABkMYinukE8nzYw",
);

/**
 * Cierto si la clave configurada es una de las ficticias de Cloudflare. En
 * producción eso es un error de despliegue —el captcha no protege nada— y el
 * widget lo anuncia en pantalla en vez de fingir que verifica a alguien.
 *
 * Se decide aquí y no en la interfaz para que el patrón de arriba siga siendo
 * la única definición de qué es una clave real.
 */
export const TURNSTILE_IS_TEST_KEY =
  TURNSTILE_SITE_KEY !== null && !TURNSTILE_SITE_KEY.startsWith("0x");

/**
 * La analítica solo se monta en producción y solo si hay algo que medir: en
 * desarrollo no se ensucia la propiedad de GA con navegación de trabajo.
 */
export const ANALYTICS_ENABLED =
  process.env.NODE_ENV === "production" && (GA_MEASUREMENT_ID !== null || META_PIXEL_ID !== null);
