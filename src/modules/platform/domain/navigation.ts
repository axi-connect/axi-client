/**
 * Navegación estática del panel de plataforma. No hay RBAC granular
 * (PlatformGuard binario): las secciones se muestran siempre.
 * El icono va como nombre lucide (string) — dominio puro, sin React;
 * la UI lo resuelve con su propio mapa (`PlatformSidebar`), no con el
 * diccionario de `core/lib/icons.ts` (cerrado al nav del backend tenant).
 *
 * Dos reglas del dueño que no se pelean (2026-09-21):
 * - Las SECCIONES van en el orden en que se declaran aquí: es intención
 *   (lo que se opera a diario antes que lo que se configura una vez).
 * - DENTRO de cada sección los ítems se ordenan de menor a mayor longitud
 *   del texto, la misma regla que `flattenUiModuleTree` aplica al menú del
 *   tenant. Se ordena en código (`sortByLabelLength`): un ítem nuevo se coloca
 *   solo y el test de invariante lo vigila.
 */
export type PlatformNavItem = {
  label: string;
  path: string;
  icon: string;
};

export type PlatformNavSection = {
  /** `null` = sin título (la portada, sola arriba, como «Inicio» en el tenant). */
  title: string | null;
  items: readonly PlatformNavItem[];
};

/** Orden estable por longitud del texto: el más corto primero; empate = orden de declaración. */
export function sortByLabelLength<T extends { label: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.label.length - b.label.length);
}

const SECTIONS: readonly PlatformNavSection[] = [
  { title: null, items: [{ label: "Dashboard", path: "/platform", icon: "layout-dashboard" }] },
  {
    // Lo que se hace con un tenant a diario: darlo de alta, emitirle la
    // entrevista de puesta en marcha, atender sus llamadas.
    title: "Operación",
    items: [
      { label: "Tenants", path: "/platform/tenants", icon: "building-2" },
      { label: "Puesta en marcha", path: "/platform/intake", icon: "message-circle-heart" },
      { label: "Llamadas", path: "/platform/calls", icon: "phone" },
    ],
  },
  {
    // Las dos caras del dinero: lo que nos cuesta la IA (Pricing) y lo que
    // cobramos (Planes, Facturación).
    title: "Dinero",
    items: [
      { label: "Planes", path: "/platform/plans", icon: "layers" },
      { label: "Pricing IA", path: "/platform/pricing", icon: "circle-dollar-sign" },
      { label: "Facturación", path: "/platform/billing", icon: "receipt" },
    ],
  },
  {
    // La capacidad IA: su catálogo de voces (§10.5) y cómo se evalúa.
    title: "IA",
    items: [
      { label: "Voces IA", path: "/platform/voices", icon: "audio-lines" },
      { label: "Calidad", path: "/platform/quality", icon: "flask-conical" },
    ],
  },
  {
    // Lo que se vigila.
    title: "Control",
    items: [
      { label: "Auditoría", path: "/platform/audit", icon: "scroll-text" },
      { label: "Analytics", path: "/platform/analytics", icon: "activity" },
    ],
  },
  {
    // Proveedores externos de la captación (prospecting F3): llaves de
    // MillionVerifier, Twilio y compañía. Se toca una vez, no se vigila.
    title: "Configuración",
    items: [{ label: "Proveedores", path: "/platform/prospecting", icon: "plug" }],
  },
];

export const PLATFORM_NAV_SECTIONS: readonly PlatformNavSection[] = SECTIONS.map((section) => ({
  ...section,
  items: sortByLabelLength(section.items),
}));

/** La lista plana, en el orden en que se muestra (para migas y buscadores). */
export const PLATFORM_NAV: PlatformNavItem[] = PLATFORM_NAV_SECTIONS.flatMap((section) => [...section.items]);
