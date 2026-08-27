import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  Building2,
  CalendarClock,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  GraduationCap,
  Inbox,
  Instagram,
  KanbanSquare,
  MessageCircle,
  MessagesSquare,
  Mic,
  Package,
  PlayCircle,
  Shirt,
  ShoppingBag,
  Store,
  UtensilsCrossed,
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
 * Estructura (plan `docs/plans/navigation_standardization_plan.md`): tres
 * mega-menús —Producto, Soluciones, Integraciones— y dos enlaces planos
 * —Precios, Casos—. `Marketplace` bajó al panel de Producto: no convierte y
 * gastaba una posición de la barra.
 *
 * Cada panel cierra con una barra de conversión, porque el alta es asistida y
 * no hay auto-registro (knowledge-base §19.2): agendar la demo o escribir por
 * WhatsApp son los dos únicos actos de conversión que existen.
 */

/** Tarjeta grande de un panel: la capacidad o el canal, con su promesa. */
export type SiteNavCard = {
  name: string;
  href: string;
  description: string;
  icon: LucideIcon;
};

/** Fila de la columna derecha: destinos secundarios, sin descripción. */
export type SiteNavRow = {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Etiqueta discreta a la derecha del label (p. ej. "Pronto"). */
  badge?: string;
};

/** Barra inferior del panel: el argumento y las dos vías de conversión. */
export type SiteNavPanelFooter = {
  /** Se pinta con el fragmento entre `**` en peso fuerte. */
  claim: string;
  /** Enlace secundario a la izquierda del CTA; sin él solo va el CTA. */
  secondary?: { name: string; href: string };
  /** Mensaje prellenado del WhatsApp comercial; sin él no se pinta el enlace. */
  whatsappMessage?: string;
};

export type SiteNavItem =
  | { kind: "link"; name: string; href: string; badge?: string }
  | {
      kind: "mega";
      name: string;
      /** Ancho del panel. Los de 4 tarjetas caben en menos. */
      cards: readonly SiteNavCard[];
      /** Columnas de tarjetas en escritorio: 3 para Producto, 2 para el resto. */
      cardColumns: 2 | 3;
      side: { title: string; rows: readonly SiteNavRow[] };
      footer: SiteNavPanelFooter;
    };

export const SITE_NAV: readonly SiteNavItem[] = [
  {
    kind: "mega",
    name: "Producto",
    cardColumns: 3,
    cards: [
      {
        name: "Agente vendedor",
        href: "/productos#agente",
        description: "Cotiza con tus precios reales y cierra dentro del chat.",
        icon: Bot,
      },
      {
        name: "Inbox y handoff",
        href: "/productos#inbox",
        description: "Tu equipo toma o devuelve el control sin que el cliente repita nada.",
        icon: Inbox,
      },
      {
        name: "CRM, leads y contactos",
        href: "/productos#crm",
        description: "El pipeline se llena mientras el agente conversa.",
        icon: KanbanSquare,
      },
      {
        name: "Catálogo y agenda",
        href: "/productos#catalogo",
        description: "Stock real por variante. Y si vendes tiempo, citas sobre disponibilidad real.",
        icon: Package,
      },
      {
        name: "Medición en pesos",
        /* La sección vive en la home (§6, LandingMetrics): /productos retiró
           su copia por duplicada — no recrear el ancla allí sin mover esto. */
        href: "/#medicion",
        description: "Cuánto vendió cada conversación, con hechos de tu base de datos.",
        icon: BarChart3,
      },
    ],
    side: {
      title: "Empezar por aquí",
      rows: [
        { name: "Cómo funciona", href: "/#como-funciona", icon: PlayCircle },
        { name: "Preguntas frecuentes", href: "/#preguntas", icon: MessagesSquare },
        { name: "Marketplace", href: "/marketplace", icon: Store, badge: "Pronto" },
        { name: "Ver todo el producto", href: "/productos", icon: Package },
      ],
    },
    footer: {
      claim: "**7 días de prueba** con el producto completo. Te lo configuramos contigo.",
      whatsappMessage: "Hola, quiero ver Axi Connect funcionando con mi negocio.",
    },
  },
  {
    kind: "mega",
    name: "Soluciones",
    cardColumns: 2,
    cards: [
      {
        name: "Califica leads sin perseguir a nadie",
        href: "/soluciones#califica",
        description: "Responde en segundos a cualquier hora y abre la oportunidad sin que nadie la digite.",
        icon: CircleDollarSign,
      },
      {
        name: "Cierra ventas dentro de la conversación",
        href: "/soluciones#cierra",
        description: "Pedido con consecutivo, inventario descontado y tus medios de pago. Sin carrito web.",
        icon: ShoppingBag,
      },
      {
        name: "Retiene clientes y recupera lo que se enfrió",
        href: "/soluciones#retiene",
        description: "Un contacto entre canales, con su historial y su ciclo de vida completo.",
        icon: MessageCircle,
      },
      {
        name: "Programa reuniones y citas",
        href: "/soluciones#agenda",
        description: "Disponibilidad calculada de verdad, con recordatorios 24 h y 1 h antes.",
        icon: CalendarClock,
      },
    ],
    side: {
      // Existe para responder la objeción más cara del embudo: "mi negocio es
      // distinto". Los cinco verticales son los de mayor encaje declarados en
      // knowledge-base §17.3, y aterrizan en las anclas de /casos.
      title: "Por industria",
      rows: [
        { name: "Retail y moda", href: "/casos#retail", icon: Shirt },
        { name: "Comida y restaurantes", href: "/casos#comida", icon: UtensilsCrossed },
        { name: "Servicios con agenda", href: "/casos#servicios", icon: CalendarDays },
        { name: "Educación y formación", href: "/casos#educacion", icon: GraduationCap },
        { name: "Alto ticket", href: "/casos#alto-ticket", icon: Building2 },
      ],
    },
    footer: {
      claim: "Un restaurante, una tienda de ropa y un estudio de grabación usan **el mismo software**.",
      secondary: { name: "Ver los tres casos", href: "/casos" },
    },
  },
  {
    kind: "mega",
    name: "Integraciones",
    cardColumns: 2,
    cards: [
      {
        // Primera tarjeta a propósito: es la ventaja de adopción más difícil de
        // copiar que tiene axi (knowledge-base §13.2).
        name: "WhatsApp Web · tu número actual",
        href: "/integraciones#whatsapp-web",
        description: "Escaneas un código y estás vendiendo hoy. Sin verificación de Meta, sin línea nueva.",
        icon: MessageCircle,
      },
      {
        name: "WhatsApp Cloud API",
        href: "/integraciones#whatsapp-cloud",
        description: "Alta de un botón, plantillas aprobadas y voz. El canal de producción.",
        icon: MessagesSquare,
      },
      {
        name: "Instagram Direct",
        href: "/integraciones#instagram",
        description: "El mismo botón y el mismo inbox. Pendiente de aprobación de permisos de Meta.",
        icon: Instagram,
      },
      {
        name: "Facebook Messenger",
        href: "/integraciones#messenger",
        description: "Adaptador propio, mismo pipeline. Pendiente de aprobación de permisos de Meta.",
        icon: MessageCircle,
      },
    ],
    side: {
      title: "Y además",
      rows: [
        { name: "Shopify", href: "/integraciones#shopify", icon: ShoppingBag },
        { name: "Nequi · Daviplata · Bancolombia", href: "/integraciones#pagos", icon: CreditCard },
        { name: "Voz del agente", href: "/integraciones#voz", icon: Mic },
        { name: "Ver todas las integraciones", href: "/integraciones", icon: Package },
      ],
    },
    footer: {
      claim: "¿Funciona con lo que ya tienes? **Conecta tu número actual** y lo compruebas el mismo día.",
      whatsappMessage: "Hola, quiero saber si Axi Connect funciona con mi WhatsApp actual.",
    },
  },
  { kind: "link", name: "Precios", href: "/precios" },
  { kind: "link", name: "Casos", href: "/casos" },
];

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
      { name: "Cómo funciona", href: "/#como-funciona" },
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
