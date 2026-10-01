import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  CalendarClock,
  Inbox,
  Package,
  Phone,
  Radar,
  Receipt,
  Sparkles,
  ScanSearch,
} from "lucide-react";

/**
 * Navegación del sitio público — fuente única de verdad.
 *
 * REGLA DURA: aquí NO entra ningún `href` sin página o ancla real. La versión
 * original del menú arrastraba las rutas de la plantilla (`/products`,
 * `/solutions`, `/blog`, `/casos`, `/ayuda`, `/login`, `/signup`) y sus labels
 * ni siquiera correspondían con su destino. Para un visitante sin sesión eso no
 * produce un 404: el middleware lo manda al login, que se lee como un muro de
 * acceso. Antes de añadir una entrada, la ruta debe existir en
 * `src/app/(public)/` Y estar listada en `PUBLIC_PATHS` (`core/config/routes.ts`).
 *
 * Estructura (plan `landing_cinematica_plan.md` §18.1, que sustituye a la de
 * `navigation_standardization_plan.md`): tres menús por intención —Vender y
 * cobrar, Crecer, Atender— y Precios en la barra; Casos e Integraciones bajan a
 * la columna lateral del panel.
 *
 * El panel cierra con una barra de conversión, porque el alta es asistida
 * (knowledge-base §19.2): la prueba y escribir por WhatsApp.
 */

/** Tarjeta grande de un panel: la capacidad o el canal, con su promesa. */
export type SiteNavCard = {
  name: string;
  href: string;
  description: string;
  icon: LucideIcon;
};

/* ─────────────────────── Nav en isla (plan §18.1) ─────────────────────── */

/**
 * Los tres menús por intención del nav en isla (lienzo aprobado el 2026-09-30).
 * Cada intención es un pilar de «Vendemos progreso» y una cinta del isotipo,
 * con su color: coral, ámbar y violeta. Las tarjetas son las del lienzo con los
 * `href` reales del sitio (la REGLA DURA de arriba: el lienzo traía «/#medicion»,
 * que no existe; es «/#medir»).
 */
export type SiteIntent = {
  id: "vender" | "crecer" | "atender";
  name: string;
  pillar: string;
  promise: string;
  /** La cinta del isotipo: decide el color del punto (token de marca). */
  tone: "coral" | "amber" | "violet";
  cards: readonly SiteNavCard[];
};

export const SITE_INTENTS: readonly SiteIntent[] = [
  {
    id: "vender",
    name: "Vender y cobrar",
    pillar: "Prosperidad",
    promise: "Más ingresos, menos costos",
    tone: "coral",
    cards: [
      { name: "Agente vendedor", href: "/productos#agente", description: "Cotiza con tus precios reales y cierra dentro del chat.", icon: Bot },
      { name: "Cobros y documentos", href: "/productos", description: "Abonos, recordatorios y el recibo listo para enviar.", icon: Receipt },
      { name: "Catálogo y pedidos", href: "/productos#catalogo", description: "Stock real por variante y pedidos sin errores.", icon: Package },
      { name: "Reconocimiento por foto", href: "/productos#reconocimiento", description: "Te mandan una foto y cotiza la referencia exacta.", icon: ScanSearch },
    ],
  },
  {
    id: "crecer",
    name: "Crecer",
    pillar: "Crecimiento",
    promise: "Más alcance, más clientes",
    tone: "amber",
    cards: [
      { name: "Axel, tu director comercial", href: "/productos", description: "Cada mañana propone qué hacer y mide si funcionó.", icon: Sparkles },
      { name: "Captación de leads", href: "/soluciones#califica", description: "Encuentra y califica a quien sí te va a comprar.", icon: Radar },
      { name: "Medición en pesos", href: "/#medir", description: "Cuánto vendió cada conversación, campaña y canal.", icon: BarChart3 },
    ],
  },
  {
    id: "atender",
    name: "Atender",
    pillar: "Libertad",
    promise: "Más tiempo, menos carga",
    tone: "violet",
    cards: [
      { name: "Inbox compartido", href: "/productos#inbox", description: "WhatsApp, Instagram y Messenger en una bandeja.", icon: Inbox },
      { name: "Llamadas con voz natural", href: "/integraciones#voz", description: "Llama desde tu número cuando hay que llamar.", icon: Phone },
      { name: "Agenda y citas", href: "/soluciones#agenda", description: "Citas sobre tu disponibilidad real, con recordatorios.", icon: CalendarClock },
    ],
  },
];

/** La columna derecha del panel: tipo de negocio, canales y, abajo, Casos e Integraciones. */
export const SITE_MENU_SIDE: readonly { title: string; rows: readonly { name: string; href: string }[] }[] = [
  {
    title: "Por tipo de negocio",
    rows: [
      { name: "Retail y moda", href: "/casos#retail" },
      { name: "Comida y restaurantes", href: "/casos#comida" },
      { name: "Servicios con agenda", href: "/casos#servicios" },
      { name: "Alto ticket", href: "/casos#alto-ticket" },
    ],
  },
  {
    title: "Conecta",
    rows: [
      { name: "WhatsApp, Instagram, Messenger", href: "/integraciones" },
      { name: "Shopify y pagos", href: "/integraciones#shopify" },
    ],
  },
];

/** Los enlaces planos: Precios en la barra; Casos e Integraciones bajan a la columna lateral (y a la hoja móvil). */
export const SITE_MENU_LINKS = {
  pricing: { name: "Precios", href: "/precios" },
  more: [
    { name: "Casos", href: "/casos" },
    { name: "Integraciones", href: "/integraciones" },
  ],
} as const;

/** La barra inferior del panel (lienzo): la prueba, WhatsApp y el CTA. */
export const SITE_MENU_FOOT = {
  claim: "**7 días de prueba** con el producto completo. Te lo configuramos contigo.",
  whatsapp: { name: "Escríbenos", message: "Hola, quiero ver Axi Connect funcionando con mi negocio." },
} as const;

/** La isla: qué dice según dónde está el visitante. */
export const SITE_ISLAND = {
  /** En la home, antes del primer capítulo de la película. */
  start: { title: "Axi Connect", sub: "La película · 4 capítulos" },
  chapter: (n: number, total: number) => `Capítulo ${n} de ${total}`,
  /** Fuera de la home: el nombre de la página y cuánto se ha leído. */
  read: (pct: number) => `${pct} % leído`,
  pages: {
    "/productos": "Productos",
    "/soluciones": "Soluciones",
    "/integraciones": "Integraciones",
    "/precios": "Precios",
    "/casos": "Casos",
    "/contacto": "Contacto",
    "/marketplace": "Marketplace",
    "/legal": "Legal",
  } as Readonly<Record<string, string>>,
  fallback: "Axi Connect",
  openMenu: "Abrir menú",
  closeMenu: "Cerrar menú",
  menuTitle: "Menú",
  ask: "¿Qué quieres hacer?",
  theme: "Tema",
} as const;

/** CTA principal del header para visitantes sin sesión. */
export const SITE_NAV_CTA = {
  label: "Agenda tu demo",
  href: "/contacto",
} as const;

/* ──────────────────────────────── Footer ──────────────────────────────── */

/**
 * Columnas del footer. Se podaron 9 de 11 enlaces de la versión original
 * (`/about`, `/casos` inexistente, `/blog`, `/ayuda`, `/seguridad`,
 * `/dashboard`): todos daban 404 o mandaban al login. Un footer corto que
 * funciona comunica más solvencia que tres columnas que no llevan a ninguna
 * parte.
 */
export const SITE_FOOTER_COLUMNS: readonly {
  title: string;
  links: readonly { name: string; href: string }[];
}[] = [
  {
    title: "Producto",
    links: [
      { name: "Cómo funciona", href: "/#quien" },
      { name: "Productos", href: "/productos" },
      { name: "Soluciones", href: "/soluciones" },
      { name: "Integraciones", href: "/integraciones" },
      { name: "Preguntas", href: "/#preguntas" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { name: "Precios", href: "/precios" },
      { name: "Casos", href: "/casos" },
      { name: "Contacto", href: "/contacto" },
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

/**
 * El CTA de la cabecera en la home. La película tiene una sola conversión, la
 * prueba de 7 días (programa landing cinematográfica, D1); el resto del sitio
 * conserva el suyo hasta que se rehaga con el mismo lenguaje (D14).
 * `shortLabel` es la versión entre `lg` y 1200 px, donde la etiqueta larga
 * partía la cabecera en dos líneas (plan §16.5).
 */
export const SITE_NAV_FILM_CTA = {
  label: "Prueba 7 días gratis",
  shortLabel: "Prueba gratis",
  href: "/comenzar?plan=free_trial",
} as const;
