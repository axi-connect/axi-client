/**
 * Navegación estática del panel de plataforma. No hay RBAC granular
 * (PlatformGuard binario): las secciones se muestran siempre.
 * El icono va como nombre lucide (string) — dominio puro, sin React;
 * la UI lo resuelve con su propio mapa (`PlatformSidebar`), no con el
 * diccionario de `core/lib/icons.ts` (cerrado al nav del backend tenant).
 */
export type PlatformNavItem = {
  label: string;
  path: string;
  icon: string;
};

export const PLATFORM_NAV: PlatformNavItem[] = [
  { label: "Dashboard", path: "/platform", icon: "layout-dashboard" },
  { label: "Tenants", path: "/platform/tenants", icon: "building-2" },
  { label: "Planes", path: "/platform/plans", icon: "layers" },
  { label: "Pricing IA", path: "/platform/pricing", icon: "circle-dollar-sign" },
  // Curaduría del catálogo de voces (§10.5). Junto a «Pricing IA» porque son
  // los dos catálogos de la capacidad IA: qué modelos se cobran y qué voces
  // se ofrecen.
  { label: "Voces IA", path: "/platform/voices", icon: "audio-lines" },
  // Facturación de la licencia. Va tras «Pricing IA» porque son las dos caras
  // del dinero: aquella es lo que nos cuesta la IA, esta lo que cobramos.
  { label: "Facturación", path: "/platform/billing", icon: "receipt" },
  { label: "Auditoría", path: "/platform/audit", icon: "scroll-text" },
  { label: "Analytics", path: "/platform/analytics", icon: "activity" },
  { label: "Calidad", path: "/platform/quality", icon: "flask-conical" },
  // Proveedores externos de la captación (prospecting F3): aquí se pegan las
  // llaves de MillionVerifier, Twilio y compañía. Va al final porque es
  // configuración que se toca una vez, no una consola que se vigila.
  { label: "Proveedores", path: "/platform/prospecting", icon: "plug" },
  { label: "Llamadas", path: "/platform/calls", icon: "phone" },
];
