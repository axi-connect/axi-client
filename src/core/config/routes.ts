// config/routes.ts
// "/platform" es la consola interna de super admin: su auth NO usa cookies
// (token en sessionStorage, ver modules/platform), así que el guard edge y el
// AuthProvider de tenant no deben interceptarla — el guard real es PlatformGuard.
//
// IMPORTANTE — toda página pública nueva DEBE listarse aquí. Si falta, el
// middleware la trata como privada y redirige al login a los visitantes
// anónimos: no da 404, da un muro de acceso (peor señal comercial que un 404).
export const PUBLIC_PATHS = [
  "/",
  // Capa pública / GTM (docs/plans/public-gtm-plan.md)
  "/productos",
  "/soluciones",
  "/contacto",
  "/legal",
  "/precios", // redirige a /#planes (next.config.ts)
  "/demo", // redirige a /contacto (next.config.ts)
  "/marketplace",
  "/auth",
  // Infraestructura y estáticos
  "/api",
  "/_next",
  "/favicon.ico",
  "/assets",
  "/fonts",
  "/images",
  "/platform",
];

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
  // El ítem `contacts` del backend vive dentro del módulo CRM del cliente.
  "/contacts": "/crm/contacts",
};

/**
 * Paths de navegación del backend que aún no tienen UI (módulos pendientes:
 * usage, audit, métodos de pago). Se filtran del sidebar para no producir 404.
 *
 * `/settings/sales` estaba sembrado en el backend pero sin página en `app/`:
 * se pintaba en el sidebar y llevaba a un 404. Al filtrarlo desaparece del
 * menú hasta que exista su vista.
 */
export const UNIMPLEMENTED_NAV_PATHS = new Set([
  "/usage",
  "/settings/audit",
  "/settings/sales",
]);

/** Resuelve el path del backend a la ruta real del frontend (o null si no hay UI). */
export function resolveNavPath(backendPath: string | null): string | null {
  if (!backendPath) return null;
  if (UNIMPLEMENTED_NAV_PATHS.has(backendPath)) return null;
  return NAV_PATH_ALIASES[backendPath] ?? backendPath;
}