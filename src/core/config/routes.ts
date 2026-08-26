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
  // Páginas de conversión del mega-menú (docs/plans/navigation_standardization_plan.md).
  // `/precios` dejó de ser un redirect a /#planes: ahora es página propia.
  "/precios",
  "/casos",
  "/integraciones",
  "/demo", // redirige a /contacto (next.config.ts)
  "/marketplace",
  "/auth",
  // Pago sin sesión (billing_frontend_plan.md F4/F5): el retorno del checkout y
  // el enlace de una factura. A los dos llega gente sin sesión —incluido un
  // tenant SUSPENDIDO por mora, que es justo el caso de uso— así que el guard no
  // puede interceptarlos. El prefijo cubre `/pay/return` y `/pay/:id/:token`.
  "/pay",
  // Infraestructura y estáticos
  "/api",
  "/_next",
  "/favicon.ico",
  "/assets",
  "/fonts",
  "/images",
  "/platform",
  // Rutas de primer nivel que genera Next para SEO y metadata. NO son
  // opcionales: el matcher del middleware solo exime `favicon.ico` de este
  // grupo, así que sin registrarlas aquí Googlebot y los scrapers de enlaces
  // (WhatsApp, LinkedIn, X, Facebook) reciben un 307 al login en vez del
  // archivo. Era el estado real de `/opengraph-image.png` en producción: la
  // imagen existía en el repo y no llegaba a ningún preview.
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  "/opengraph-image.png",
  "/icon.svg",
  "/apple-icon.png",
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