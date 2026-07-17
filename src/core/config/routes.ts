// config/routes.ts
// "/platform" es la consola interna de super admin: su auth NO usa cookies
// (token en sessionStorage, ver modules/platform), así que el guard edge y el
// AuthProvider de tenant no deben interceptarla — el guard real es PlatformGuard.
export const PUBLIC_PATHS = ["/", "/marketplace", "/auth", "/api", "/_next", "/favicon.ico", "/assets", "/fonts", "/images", "/platform"];

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/**
 * Alias transitorios entre los `path` que emite `GET /me/navigation` (seed del
 * backend) y las rutas actuales del frontend. La meta es alinear las carpetas
 * de `app/` a los paths del backend y vaciar esta tabla fase a fase.
 */
export const NAV_PATH_ALIASES: Record<string, string> = {
  "/inbox": "/workspace/inbox",
  "/ai-agents": "/admin/agents",
  "/catalog": "/catalog/products",
};

/**
 * Paths de navegación del backend que aún no tienen UI (módulos pendientes:
 * contacts, usage, audit). Se filtran del sidebar para no producir 404.
 */
export const UNIMPLEMENTED_NAV_PATHS = new Set([
  "/contacts",
  "/usage",
  "/settings/audit",
  "/settings/channels",
]);

/** Resuelve el path del backend a la ruta real del frontend (o null si no hay UI). */
export function resolveNavPath(backendPath: string | null): string | null {
  if (!backendPath) return null;
  if (UNIMPLEMENTED_NAV_PATHS.has(backendPath)) return null;
  return NAV_PATH_ALIASES[backendPath] ?? backendPath;
}