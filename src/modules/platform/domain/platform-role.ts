/**
 * Rol del admin de plataforma, leído del claim `platform_role` del access
 * token. SOLO para la UI (ocultar o deshabilitar lo que el rol no puede hacer
 * y decir por qué): quien decide es el servidor (`platformRoleGuard`).
 */
export type PlatformRole = "super_admin" | "support" | "billing_ops";

const ROLES: readonly PlatformRole[] = ["super_admin", "support", "billing_ops"];

function decodeSegment(segment: string): unknown {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  // UTF-8 sin TextDecoder: cada byte a `%xx` y `decodeURIComponent`.
  const utf8 = Array.from(binary, (char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join("");
  return JSON.parse(decodeURIComponent(utf8));
}

/** El `sub` del token (id del admin de plataforma), o null. */
export function platformUserIdFromToken(token: string | null): string | null {
  if (!token) return null;
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const sub = (decodeSegment(payload) as { sub?: unknown }).sub;
    return typeof sub === "string" && sub !== "" ? sub : null;
  } catch {
    return null;
  }
}

/** null si no hay token, está mal formado o no trae un rol conocido. */
export function platformRoleFromToken(token: string | null): PlatformRole | null {
  if (!token) return null;
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const claims = decodeSegment(payload) as { platform_role?: unknown };
    const role = claims.platform_role;
    return typeof role === "string" && (ROLES as readonly string[]).includes(role) ? (role as PlatformRole) : null;
  } catch {
    return null;
  }
}

/**
 * Enviar, reenviar y guardar la oferta de una entrega: solo `super_admin`.
 * `support` ve la página y la vista previa, pero no envía. Sin rol conocido
 * (token viejo) no se bloquea en la UI: el servidor responde 403 si no toca.
 */
export function canSendDelivery(role: PlatformRole | null): boolean {
  return role === null || role === "super_admin";
}
