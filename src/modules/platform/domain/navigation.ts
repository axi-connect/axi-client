/**
 * Navegación estática del panel de plataforma. No hay RBAC granular
 * (PlatformGuard binario): las 6 secciones se muestran siempre.
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
  { label: "Auditoría", path: "/platform/audit", icon: "scroll-text" },
  { label: "Analytics", path: "/platform/analytics", icon: "activity" },
];
