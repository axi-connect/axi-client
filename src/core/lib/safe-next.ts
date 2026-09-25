/**
 * El destino de un `?next=` (o `redirect`, `returnTo`, `callbackUrl`, `from`)
 * convertido en una ruta INTERNA segura, o el `fallback`.
 *
 * Es la defensa contra el open redirect y la inyección de `javascript:` (QA
 * H3-1): el login hacía `router.replace(search.get("next"))` sin validar, y
 * `next=//evil.com` sacaba del origen y `next=javascript:alert(1)` ejecutaba.
 *
 * Reglas, todas a la vez:
 * - empieza por `/` y no por `//` ni `/\` (rutas relativas al host o de red);
 * - sin caracteres de control ni barras invertidas (los navegadores las
 *   normalizan a `/`), y sin esquema;
 * - resuelto con `new URL(next, origin)`, conserva EXACTAMENTE ese origen;
 * - opcional por consumidor: `allowedPrefixes` (lista blanca) y
 *   `blockedPrefixes` (p. ej. `/auth`, para no volver al login en bucle).
 *
 * Devuelve solo `pathname + search + hash`, nunca la URL absoluta.
 */
export type SafeNextOptions = {
  fallback?: string;
  /** Origen contra el que se resuelve; por defecto, el de la página. */
  origin?: string;
  allowedPrefixes?: readonly string[];
  blockedPrefixes?: readonly string[];
};

export const DEFAULT_NEXT = "/dashboard";

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`);
}

function defaultOrigin(): string {
  return typeof window !== "undefined" && window.location?.origin ? window.location.origin : "http://localhost";
}

export function safeInternalNext(next: string | null | undefined, options: SafeNextOptions = {}): string {
  const fallback = options.fallback ?? DEFAULT_NEXT;
  if (typeof next !== "string" || next === "") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  // Barras invertidas y controles (tab, salto de línea): el navegador los
  // limpia o los vuelve `/`, y `/\t/evil.com` terminaría en `//evil.com`.
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;

  const origin = options.origin ?? defaultOrigin();
  let url: URL;
  let base: URL;
  try {
    base = new URL(origin);
    url = new URL(next, base);
  } catch {
    return fallback;
  }
  if (url.origin !== base.origin) return fallback;
  if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;

  const { pathname } = url;
  // Una ruta que decodificada empieza por `//` (`/%2F%2Fevil.com`) tampoco:
  // otro salto la podría servir como ruta de red.
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return fallback;
  }
  if (decoded.startsWith("//") || decoded.startsWith("/\\")) return fallback;
  // Tampoco controles ni saltos codificados (`/%09/evil.com`, `/%0a…`): el
  // login los llevaba a un 404 interno en vez de al panel (QA H4-1).
  if (/[\u0000-\u001f\u007f]/.test(decoded)) return fallback;

  if (options.blockedPrefixes?.some((prefix) => matchesPrefix(pathname, prefix))) return fallback;
  if (options.allowedPrefixes && !options.allowedPrefixes.some((prefix) => matchesPrefix(pathname, prefix))) {
    return fallback;
  }
  return `${pathname}${url.search}${url.hash}`;
}
