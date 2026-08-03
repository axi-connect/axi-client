/**
 * Navegación del sitio público — fuente única de verdad.
 *
 * REGLA DURA: aquí NO entra ningún `href` sin página o ancla real. La versión
 * anterior de este menú arrastraba las rutas de la plantilla original
 * (`/products`, `/solutions`, `/blog`, `/casos`, `/ayuda`, `/login`, `/signup`)
 * y sus labels ni siquiera correspondían con su destino. Para un visitante sin
 * sesión eso no producía un 404: el middleware lo mandaba al login, que se lee
 * como un muro de acceso. Ver `docs/plans/public-gtm-plan.md` §F2.
 *
 * Antes de añadir una entrada: la ruta debe existir en `src/app/(public)/` Y
 * estar listada en `PUBLIC_PATHS` (`core/config/routes.ts`).
 */

export type SiteNavChild = {
  name: string;
  href: string;
  description: string;
};

export type SiteNavItem = {
  name: string;
  href: string;
  /** Etiqueta discreta a la derecha del label (p. ej. "Pronto"). */
  badge?: string;
  children?: readonly SiteNavChild[];
};

export const SITE_NAV: readonly SiteNavItem[] = [
  {
    name: "Productos",
    href: "/productos",
    children: [
      {
        name: "Agente vendedor",
        href: "/productos#agente",
        description: "Cotiza y cierra dentro del chat",
      },
      {
        name: "Inbox y handoff",
        href: "/productos#inbox",
        description: "Tu equipo entra sin fricción",
      },
      {
        name: "CRM, leads y contactos",
        href: "/productos#crm",
        description: "El pipeline se llena solo",
      },
      {
        name: "Catálogo y agenda",
        href: "/productos#catalogo",
        description: "Stock real, citas reales",
      },
      {
        name: "Medición en pesos",
        href: "/productos#medicion",
        description: "Cuánto vendió cada conversación",
      },
    ],
  },
  {
    name: "Soluciones",
    href: "/soluciones",
    children: [
      {
        name: "Califica leads",
        href: "/soluciones#califica",
        description: "Sin perseguir a nadie",
      },
      {
        name: "Cierra ventas",
        href: "/soluciones#cierra",
        description: "Dentro de la conversación",
      },
      {
        name: "Retiene clientes",
        href: "/soluciones#retiene",
        description: "Y recupera lo que se enfrió",
      },
      {
        name: "Programa reuniones",
        href: "/soluciones#agenda",
        description: "Sobre disponibilidad real",
      },
    ],
  },
  // La sección de planes vive en la home (`#planes`), no en página propia:
  // /precios redirige ahí (next.config.ts). Se conserva la etiqueta "Precios"
  // porque es el término con el que la gente busca.
  { name: "Precios", href: "/#planes" },
  { name: "Marketplace", href: "/marketplace", badge: "Pronto" },
];

/** CTA principal del header para visitantes sin sesión. */
export const SITE_NAV_CTA = {
  label: "Agenda tu demo",
  href: "/contacto",
} as const;

/* ──────────────────────────────── Footer ──────────────────────────────── */

/**
 * Columnas del footer. Se podaron 9 de 11 enlaces de la versión anterior
 * (`/soluciones` mal escrito, `/about`, `/casos`, `/blog`, `/ayuda`,
 * `/seguridad`, `/legal`, `/dashboard`): todos daban 404 o mandaban al login.
 *
 * Un footer corto que funciona comunica más solvencia que tres columnas
 * completas que no llevan a ninguna parte.
 */
export const SITE_FOOTER_COLUMNS: readonly {
  title: string;
  links: readonly { name: string; href: string }[];
}[] = [
  {
    title: "Producto",
    links: [
      { name: "Cómo funciona", href: "/#como-funciona" },
      { name: "Productos", href: "/productos" },
      { name: "Soluciones", href: "/soluciones" },
      { name: "Planes", href: "/#planes" },
      { name: "Preguntas", href: "/#preguntas" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { name: "Contacto", href: "/contacto" },
      { name: "Casos", href: "/#casos" },
      { name: "Iniciar sesión", href: "/auth/login" },
    ],
  },
  {
    title: "Legal",
    links: [
      { name: "Términos", href: "/legal/terminos" },
      { name: "Privacidad", href: "/legal/privacidad" },
    ],
  },
];

/**
 * Redes sociales de Axi Connect.
 *
 * VACÍO A PROPÓSITO: la versión anterior mostraba X, GitHub y LinkedIn con
 * `href="#"`. Un icono de red que no lleva a ningún sitio es peor que no
 * tenerlo. Se rellena cuando existan los perfiles.
 */
export const SITE_SOCIALS: readonly {
  label: string;
  href: string;
  icon: "linkedin" | "instagram" | "facebook" | "x" | "youtube" | "tiktok";
}[] = [];

/** Destino del enlace de sesión según el estado de autenticación. */
export const SITE_NAV_SESSION: Record<
  "loading" | "authenticated" | "unauthenticated" | "suspended",
  { text: string; href: string }
> = {
  authenticated: { text: "Cerrar sesión", href: "/auth/logout" },
  unauthenticated: { text: "Iniciar sesión", href: "/auth/login" },
  loading: { text: "Cargando...", href: "/auth/login" },
  // F15: en estado suspendido el AuthProvider renderiza la pantalla bloqueante
  // en lugar del árbol; esta entrada solo satisface el tipo.
  suspended: { text: "Iniciar sesión", href: "/auth/login" },
};
