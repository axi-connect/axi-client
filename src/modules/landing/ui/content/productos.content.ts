/**
 * Contenido completo de `/productos` (F6 del plan GTM).
 *
 * REGLA (la misma de `landing.content.ts`): ninguna sección hardcodea texto,
 * cifras ni URLs — todo sale de aquí.
 *
 * Honestidad del contenido:
 * - `AGENT_TOOLS` son los 18 archivos reales de
 *   `axi-server/src/modules/ai_agents/application/tools/*.tool.ts` — no se
 *   inventan herramientas ni se redondea la cifra.
 * - Las capturas (`PRODUCT_SHOTS`) son las únicas imágenes reales del producto
 *   que existen, cosechadas del árbol legacy `layout/site/` (las URLs se copian,
 *   el componente legacy no se importa).
 * - El video del hero AÚN NO EXISTE en Cloudinary: `HERO_VIDEO.publicId` es el
 *   contrato con quien lo suba. Mientras el asset no resuelva, el hero degrada
 *   al `BrandGradientCanvas` de marca (nunca se ve roto).
 */

/* ────────────────────────── Capturas reales ────────────────────────── */

const CLOUDINARY_IMG = "https://res.cloudinary.com/dpfnxj52w/image/upload";

export const PRODUCT_SHOTS = {
  /** Pantalla de configuración de agentes (media del pin-reveal). */
  agents: {
    src: `${CLOUDINARY_IMG}/v1762278699/agents-cover_v9gbrg.png`,
    alt: "Configuración del agente de IA en el panel de Axi Connect",
  },
  /** Conversación real del producto. */
  conversation: {
    src: `${CLOUDINARY_IMG}/v1762284864/conversation-cover_rghzsm.png`,
    alt: "Conversación del agente de Axi Connect con un cliente",
  },
  /** Captura completa del inbox del workspace. */
  inbox: {
    src: `${CLOUDINARY_IMG}/v1762256600/screencapture-axi-connect-local-workspace-inbox_c3voug.png`,
    alt: "Inbox omnicanal de Axi Connect con la cola de conversaciones y el hilo abierto",
  },
} as const;

/* ─────────────────────────── Video del hero ────────────────────────── */

const CLOUDINARY_VIDEO = "https://res.cloudinary.com/dpfnxj52w/video/upload";

/**
 * Streaming progresivo (HTTP range) con transcodificación de Cloudinary:
 * H.264 como base universal + VP9 para navegadores que lo prefieran, dos
 * anchos según viewport y poster extraído del propio video (segundo 2).
 * Las derivadas se generan on-the-fly en la primera petición y quedan
 * cacheadas en el CDN — no hay nada más que configurar en Cloudinary.
 */
const HERO_VIDEO_ID = "optimized_axi-connect-product_wcopqg";

export const HERO_VIDEO = {
  publicId: HERO_VIDEO_ID,
  poster: `${CLOUDINARY_VIDEO}/so_2,q_auto,f_jpg,w_1600/${HERO_VIDEO_ID}.jpg`,
  desktop: {
    webm: `${CLOUDINARY_VIDEO}/vc_vp9,q_auto,w_1920/${HERO_VIDEO_ID}.webm`,
    mp4: `${CLOUDINARY_VIDEO}/vc_h264,q_auto,w_1920/${HERO_VIDEO_ID}.mp4`,
  },
  mobile: {
    webm: `${CLOUDINARY_VIDEO}/vc_vp9,q_auto,w_960/${HERO_VIDEO_ID}.webm`,
    mp4: `${CLOUDINARY_VIDEO}/vc_h264,q_auto,w_960/${HERO_VIDEO_ID}.mp4`,
  },
  ariaLabel: "Video de bienvenida: el producto Axi Connect en acción",
} as const;

/* ─────────────────────────────── Hero ──────────────────────────────── */

export const PRODUCTOS_HERO = {
  /**
   * Eco del gancho del video de bienvenida (Cristian, fundador y CTO): «El
   * canal por el que hoy ingresa el dinero es el peor gestionado de las
   * empresas…». El titular no vende: teasea el diálogo que el video abre.
   */
  headline: "El canal por donde hoy entra el dinero es el peor gestionado de tu empresa.",
  ctaPrimary: { label: "Agenda tu demo", href: "/contacto" },
  ctaSecondary: { label: "Ver el producto", href: "#agente" },
  soundOn: "Activar sonido",
  soundOff: "Silenciar",
  play: "Reproducir video",
  stats: [
    { id: "tools", value: 18, label: "herramientas reales del agente" },
    { id: "ais", value: 4, label: "IAs distintas trabajando juntas" },
    { id: "metrics", value: 9, label: "métricas medidas en pesos" },
  ],
} as const;

/* ─────────────────────── #agente · pin-reveal ──────────────────────── */

/**
 * Los 18 tools reales del agente (nombres literales del registro del backend).
 * En móvil las secciones muestran un subconjunto + el total.
 */
export const AGENT_TOOLS = [
  "catalog_lookup",
  "quote_order",
  "create_order",
  "get_payment_methods",
  "report_payment",
  "get_order_status",
  "apply_promotion",
  "validate_coupon",
  "send_product_images",
  "send_resource",
  "book_appointment",
  "schedule_availability",
  "schedule_follow_up",
  "save_contact_data",
  "open_deal",
  "log_crm_activity",
  "human_handoff",
  "close_conversation",
] as const;

export const AGENT_REVEAL = {
  title: "Se configura, no se programa.",
  sub: "Las herramientas se cargan según lo que tu negocio tiene de verdad: sin catálogo, no ofrece productos.",
  toolsTotal: `${AGENT_TOOLS.length} herramientas en total`,
} as const;

/* ─────────────────── Carrusel · seis capacidades ───────────────────── */

export interface CapabilityItem {
  id: string;
  tag: string;
  title: string;
  description: string;
  href: string;
}

export const CAPABILITIES_SECTION = {
  kicker: "Un producto, seis capacidades",
  title: "Explóralo pieza por pieza",
} as const;

export const CAPABILITIES: readonly CapabilityItem[] = [
  {
    id: "agente",
    tag: "IA que vende",
    title: "Agente vendedor",
    description: "Conversa, cotiza y cierra en tus canales, 24/7.",
    href: "#agente",
  },
  {
    id: "inbox",
    tag: "Operación",
    title: "Inbox y handoff",
    description: "Un solo inbox; la IA entrega y retoma sola.",
    href: "#inbox",
  },
  {
    id: "crm",
    tag: "Datos",
    title: "CRM y leads",
    description: "Pipeline que se llena mientras el agente habla.",
    href: "#crm",
  },
  {
    id: "catalogo",
    tag: "Inventario",
    title: "Catálogo ERP",
    description: "Variantes, SKU y stock real, sin prometer humo.",
    href: "#catalogo",
  },
  {
    id: "agenda",
    tag: "Tiempo",
    title: "Agenda",
    description: "Citas sobre disponibilidad real y recordatorios.",
    href: "#catalogo",
  },
  {
    id: "medicion",
    tag: "Resultados",
    title: "Medición en pesos",
    description: "Ventas atribuidas del hola al pago verificado.",
    /* La medición vive en la home (§6) — /productos retiró su copia. */
    href: "/#medicion",
  },
];

/* ────────────────────────── #inbox · handoff ───────────────────────── */

export const INBOX_SECTION = {
  kicker: "Inbox y handoff",
  title: "Tu equipo entra cuando hace falta. El agente se aparta solo.",
  intro:
    "Todas las conversaciones de todos los canales, en un solo lugar — con la IA marcando cuáles necesitan un humano.",
  browser: {
    url: "app.axiconnect.co/workspace/inbox",
    tab: "Inbox — Axi Connect",
  },
  features: [
    {
      id: "handoff",
      title: "Toma y devuelve la conversación",
      body: "El agente entrega el contexto completo y retoma cuando el humano termina.",
    },
    {
      id: "unified",
      title: "Un contacto, todos los canales",
      body: "WhatsApp, Instagram y Messenger convergen en la misma ficha.",
    },
    {
      id: "context",
      title: "Notas y contexto de la IA",
      body: "Resumen de la intención y del pedido antes de que tu vendedor diga hola.",
    },
  ],
} as const;

/* ─────────────────────────── #crm · bento ──────────────────────────── */

export const CRM_SECTION = {
  kicker: "CRM · leads y contactos",
  title: "El pipeline se llena mientras el agente conversa",
  intro: "Sin formularios ni digitación: cada conversación deja lead, etapa y actividad registrada.",
  cards: {
    scoring: {
      stat: "100%",
      title: "Scoring explicable",
      body: "Hitos de embudo deterministas — sabes por qué cada lead vale lo que vale.",
    },
    pipeline: {
      title: "Oportunidades solas",
      body: "El agente abre el deal y lo mueve de etapa según lo que pasa en el chat.",
      stages: ["Prospecto", "Lead", "Cotizado", "Cliente"],
    },
    unified: {
      title: "Contacto unificado",
      body: "La misma persona en WhatsApp e Instagram es un solo contacto, no dos.",
    },
    copilot: {
      title: "Copiloto para tu vendedor",
      body: "Resume, sugiere la siguiente jugada y redacta por él — dentro del inbox.",
      suggestions: [
        "Resumir la conversación antes del handoff",
        "Redactar seguimiento: cotización enviada hace 2 días",
      ],
    },
    honest: {
      title: "Motor real, en producción",
      body: "El CRM corre hoy en el backend: el agente ya registra deals y actividades. La pantalla de gestión llega al panel — sin humo.",
      code: 'deal.stage: "quoted" → activity logged',
    },
  },
} as const;

/* ─────────────────── #catalogo · catálogo + agenda ─────────────────── */

export const CATALOG_SECTION = {
  kicker: "Catálogo y agenda",
  title: "Catálogo nivel ERP, entendido por la IA",
  intro:
    "Categorías, variantes, SKU y stock real. El agente busca aunque el cliente escriba con errores — y nunca ofrece lo que no hay.",
  features: [
    {
      id: "search",
      title: "Búsqueda tolerante a typos",
      body: "«hodie» encuentra la hoodie. El cliente no habla en SKU.",
    },
    {
      id: "variants",
      title: "Variantes y stock por SKU",
      body: "Talla, color y unidades reales antes de prometer.",
    },
  ],
  tablet: {
    search: "hodie coral → hoodie coral ✓",
    category: "Ropa",
    products: [
      { id: "p1", name: "Hoodie coral", sku: "HD-CRL-M", stock: 12, tone: "brand" },
      { id: "p2", name: "Tenis urban", sku: "TN-URB-40", stock: 2, tone: "amber" },
      { id: "p3", name: "Gorra alfa", sku: "GR-ALF-U", stock: 31, tone: "brand" },
      { id: "p4", name: "Morral trek", sku: "MR-TRK-L", stock: 8, tone: "amber" },
      { id: "p5", name: "Correa sport", sku: "WB-SPT-S", stock: 3, tone: "brand" },
      { id: "p6", name: "Lentes noir", sku: "LN-NR-U", stock: 17, tone: "amber" },
    ],
  },
  agenda: {
    title: "Agenda sobre disponibilidad real",
    body: "Horario del negocio + recordatorios automáticos 24 h y 1 h antes.",
    /** Días ocupados del mini-calendario (deterministas, nunca aleatorios). */
    busyDays: [2, 4, 10, 12] as readonly number[],
  },
} as const;

/* ─────────────── Muro de conversaciones (pre-CTA) ──────────────── */

/**
 * La sección de medición se retiró de esta página (duplicaba la §6 de la
 * home — el ancla del mega-menú apunta ahora a `/#medicion`). En su lugar,
 * el muro 3D de conversaciones: mensajes de clientes y respuestas del agente
 * en negocios FICTICIOS de retail, comida y moda (jamás clientes reales sin
 * permiso), con la voz del producto.
 */
export interface WallMessage {
  id: string;
  business: string;
  channel: "whatsapp" | "instagram" | "messenger";
  from: "customer" | "agent";
  text: string;
}

export const CONVERSATIONS_SECTION = {
  kicker: "En vivo, en tus canales",
  title: "Así suena un negocio con Axi",
  intro:
    "Clientes de moda, comida y retail escribiendo a cualquier hora — y el agente respondiendo en segundos, con datos reales.",
} as const;

/** Tres columnas del muro; cada una alterna cliente ↔ agente. */
export const CHAT_WALL: readonly (readonly WallMessage[])[] = [
  [
    { id: "w1", business: "Moda Lunar", channel: "whatsapp", from: "customer", text: "¿La hoodie oversize la tienen en talla M?" },
    { id: "w2", business: "Moda Lunar", channel: "whatsapp", from: "agent", text: "Quedan 3 en M, $129.900. ¿Te la aparto?" },
    { id: "w3", business: "Kicks Bogotá", channel: "instagram", from: "customer", text: "Vi las tenis del reel, ¿en cuánto salen?" },
    { id: "w4", business: "Kicks Bogotá", channel: "instagram", from: "agent", text: "$289.900 y hoy el envío va gratis. Te paso las fotos." },
    { id: "w5", business: "Moda Lunar", channel: "whatsapp", from: "customer", text: "¿El cambio de talla tiene costo?" },
  ],
  [
    { id: "w6", business: "Burger 33", channel: "messenger", from: "customer", text: "¿Llegan hasta Cedritos?" },
    { id: "w7", business: "Burger 33", channel: "messenger", from: "agent", text: "Sí, en unos 35 minutos. ¿Repetimos tu última orden?" },
    { id: "w8", business: "Burger 33", channel: "whatsapp", from: "customer", text: "¿El combo familiar trae gaseosa?" },
    { id: "w9", business: "Burger 33", channel: "whatsapp", from: "agent", text: "Trae una de 1.5 L. ¿Lo confirmo para las 8:00?" },
    { id: "w10", business: "Dulce Alma", channel: "instagram", from: "customer", text: "Necesito una torta para 20 personas el sábado." },
  ],
  [
    { id: "w11", business: "TechNova", channel: "whatsapp", from: "agent", text: "Tu pedido #1043 salió a despacho. Te comparto la guía." },
    { id: "w12", business: "TechNova", channel: "whatsapp", from: "customer", text: "¿Puedo pagar con Nequi?" },
    { id: "w13", business: "TechNova", channel: "whatsapp", from: "agent", text: "Sí: Nequi, tarjeta o contraentrega. Como prefieras." },
    { id: "w14", business: "BarberLab", channel: "messenger", from: "customer", text: "¿Tienen cita mañana a las 10:00?" },
    { id: "w15", business: "BarberLab", channel: "messenger", from: "agent", text: "Las 10:00 están libres. Te agendo y te llega recordatorio." },
  ],
] as const;

/* ─────────────────────────── CTA final ─────────────────────────────── */

export const PRODUCTOS_CTA = {
  title: "Míralo vender en vivo, con tu propio catálogo",
  body: "Demo de 30 minutos — del hola al pago verificado, con un negocio como el tuyo.",
  cta: { label: "Agenda tu demo", href: "/contacto" },
} as const;
