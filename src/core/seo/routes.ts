/**
 * Inventario de las rutas públicas INDEXABLES y su jerarquía.
 *
 * Es deliberadamente distinto de `PUBLIC_PATHS` (core/config/routes.ts), que
 * responde a otra pregunta: aquélla dice qué deja pasar el middleware —e
 * incluye `/api`, `/_next`, los estáticos y `/auth`—, ésta dice qué debe
 * conocer Google. Mezclarlas metería el login y los assets en el sitemap.
 *
 * Fuente única para `sitemap.ts` y para las migas de pan del JSON-LD, para que
 * no puedan desincronizarse.
 *
 * NO listar aquí los redirects 308 declarados en `next.config.ts` (`/demo`,
 * `/products`, `/solutions`, `/login`, `/signup`, `/registro`, `/legal` a secas): una URL
 * que redirige no es canónica y ensucia el informe de cobertura.
 */
export type IndexableRoute = {
  /** Path absoluto desde la raíz del sitio. */
  readonly path: string;
  /** Nombre corto para las migas de pan (`BreadcrumbList`). */
  readonly label: string;
  readonly changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  /** Prioridad relativa DENTRO del sitio; no es una señal de ranking absoluta. */
  readonly priority: number;
};

export const INDEXABLE_ROUTES: readonly IndexableRoute[] = [
  { path: "/", label: "Inicio", changeFrequency: "weekly", priority: 1.0 },
  { path: "/precios", label: "Precios", changeFrequency: "weekly", priority: 0.9 },
  { path: "/productos", label: "Productos", changeFrequency: "monthly", priority: 0.8 },
  { path: "/soluciones", label: "Soluciones", changeFrequency: "monthly", priority: 0.8 },
  { path: "/integraciones", label: "Integraciones", changeFrequency: "monthly", priority: 0.8 },
  { path: "/casos", label: "Casos", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contacto", label: "Agenda tu demo", changeFrequency: "yearly", priority: 0.7 },
  { path: "/marketplace", label: "Marketplace", changeFrequency: "monthly", priority: 0.4 },
  { path: "/legal/terminos", label: "Términos y condiciones", changeFrequency: "yearly", priority: 0.3 },
  { path: "/legal/privacidad", label: "Política de privacidad", changeFrequency: "yearly", priority: 0.3 },
  { path: "/legal/eliminacion-de-datos", label: "Cómo eliminar tus datos", changeFrequency: "yearly", priority: 0.3 },
] as const;

/** Prefijos que jamás deben rastrearse: panel privado, consola y BFF. */
export const DISALLOWED_PREFIXES = [
  "/api/",
  "/auth/",
  "/platform/",
  "/workspace/",
  "/admin/",
  "/settings/",
  "/dashboard/",
  "/crm/",
  "/catalog/",
  "/orders/",
  "/marketing/",
  "/analytics/",
  "/integrations/",
  // Pago sin sesión: la URL lleva un token de un solo recurso.
  "/pay/",
  // Funnel de registro y onboarding: páginas de proceso, no de contenido.
  "/comenzar",
  "/onboarding",
] as const;

/** Etiqueta legible de un path indexable, para migas de pan. */
export function routeLabel(path: string): string | null {
  return INDEXABLE_ROUTES.find((r) => r.path === path)?.label ?? null;
}
