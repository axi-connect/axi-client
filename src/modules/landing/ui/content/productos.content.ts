/**
 * Contenido completo de `/productos` (F6 del plan GTM).
 *
 * REGLA (la misma de `landing.content.ts`): ninguna sección hardcodea texto,
 * cifras ni URLs — todo sale de aquí.
 *
 * Honestidad del contenido:
 * - `AGENT_TOOLS` son los 18 archivos reales de
 *   `axi-server/src/modules/ai_agents/application/tools/*.tool.ts` — no se
 *   inventan herramientas ni se redondea la cifra. Cada beat de `AGENT_DEMO`
 *   declara qué tools respaldan lo que enseña, y un test lo verifica.
 * - Las capturas (`PRODUCT_SHOTS`) son las únicas imágenes reales del producto
 *   que existen, cosechadas del árbol legacy `layout/site/` (las URLs se copian,
 *   el componente legacy no se importa).
 * - La conversación de `#agente` es un negocio FICTICIO (Óptica Vértice), como
 *   el muro de `CHAT_WALL`. Es el tercer vertical de la plataforma a propósito:
 *   la home ya usa tecnología (`HERO_CHAT`) y moda (`STORY_CHAT`).
 */

/* ────────────────────────── Capturas reales ────────────────────────── */

const CLOUDINARY_IMG = "https://res.cloudinary.com/dpfnxj52w/image/upload";

export const PRODUCT_SHOTS = {
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
 * Streaming progresivo (HTTP range) con transcodificación de Cloudinary. Cada
 * variante trae SU PROPIO póster además del video: el póster 16:9 sobre un
 * móvil vertical se vería recortado y provocaría un salto de encuadre al
 * arrancar la reproducción. Las derivadas se generan on-the-fly en la primera
 * petición y quedan cacheadas en el CDN — no hay nada más que configurar.
 *
 * DOS MÁSTERES, no dos recortes del mismo. El horizontal es el que va en el
 * marco de cine de escritorio; el vertical se grabó aparte para que en un
 * móvil el cuadro llene la pantalla sin perder nada. `HeroVideo` elige uno u
 * otro en el MISMO umbral que la maqueta (`md`, 768px).
 *
 * CALIDAD — `q_90`, nunca `q_auto`. Medido sobre el máster horizontal
 * (1920×1080 a 5,15 Mbps):
 *
 * | transformación   | bitrate  |
 * |------------------|----------|
 * | `q_auto` H.264   | 1,09 Mbps|
 * | `q_auto:best`    | 2,32 Mbps|
 * | **`q_90`**       | 3,11 Mbps|
 *
 * `q_auto` recorta el 79% del bitrate sin tocar la resolución: por eso el
 * video se veía blando. `q_90` deja 32 MB para 84 s, que en streaming
 * progresivo el navegador NO descarga de golpe — pide solo lo que reproduce.
 *
 * Se retiró la fuente WebM/VP9 (ver `HeroVideoSources`): Cloudinary la
 * comprimía aún más y, al ir primero, era la que elegían Chrome y Firefox.
 */
const HERO_VIDEO_Q = "q_90";
/** Máster horizontal 1920×1080 — marco de cine en escritorio. */
const HERO_VIDEO_ID = "axi-producto-hero_anqcob";
/** Máster vertical 1080×1920 — a sangre en móvil. */
const HERO_VIDEO_ID_9X16 = "axi-producto-hero-9x16_tcfaou";

const heroVariant = (id: string, width: number) => ({
  mp4: `${CLOUDINARY_VIDEO}/vc_h264,${HERO_VIDEO_Q},w_${width}/${id}.mp4`,
  poster: `${CLOUDINARY_VIDEO}/so_2,${HERO_VIDEO_Q},f_jpg,w_${width}/${id}.jpg`,
});

export const HERO_VIDEO = {
  publicId: HERO_VIDEO_ID,
  desktop: heroVariant(HERO_VIDEO_ID, 1920),
  mobile: heroVariant(HERO_VIDEO_ID_9X16, 1080),
  ariaLabel: "Video de bienvenida: el producto Axi Connect en acción",
} as const;

/* ──────────────── Las 18 herramientas reales del agente ────────────── */

/**
 * Nombres literales del registro del backend
 * (`ai_agents/application/tools/*.tool.ts`). No se renderizan en ningún sitio
 * —son vocabulario de desarrollador, no de dueño de negocio— pero son la
 * fuente de la cifra del hero y el respaldo de cada beat de la demo.
 *
 * Va antes que todo lo que lo consume: `PRODUCTOS_HERO` lee su `length` al
 * inicializarse y un `const` declarado más abajo estaría en zona muerta.
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

/* ─────────────────────────────── Hero ──────────────────────────────── */

export const PRODUCTOS_HERO = {
  /**
   * Eco del gancho del video de bienvenida (Cristian, fundador y CTO): «El
   * canal por el que hoy ingresa el dinero es el peor gestionado de las
   * empresas…». El titular no vende: teasea el diálogo que el video abre.
   * Dos líneas con jerarquía —la primera plantea (apagada), la segunda
   * remata (brillante)— el mismo lockup muted/strong de METRICS en la home.
   */
  headlineMuted: "El canal por donde hoy entra el dinero",
  headlineStrong: "es el peor gestionado de tu empresa.",
  ctaPrimary: { label: "Agenda tu demo", href: "/contacto" },
  ctaSecondary: { label: "Ver el producto", href: "#agente" },
  soundOn: "Escuchar el mensaje",
  soundOff: "Silenciar",
  play: "Reproducir video",
  stats: [
    /* El 18 se DERIVA de `AGENT_TOOLS`: si el backend suma una herramienta y
       se añade abajo, la cifra del hero sube sola. Una sola fuente. */
    { id: "tools", value: AGENT_TOOLS.length, label: "herramientas reales del agente" },
    { id: "ais", value: 4, label: "IAs distintas trabajando juntas" },
    { id: "metrics", value: 9, label: "métricas medidas en pesos" },
  ],
} as const;

/* ────────────────── #agente · la demo en vivo (pin) ────────────────── */

/**
 * Mensajes de la conversación. Tipo PROPIO de esta escena: el `ChatMessage`
 * de `landing.content.ts` no tiene tarjeta de pedido ni comprobante, y
 * extenderlo arrastraría los dos mockups de la home.
 */
export type DemoMessage =
  | { id: string; from: "customer" | "agent"; kind: "text"; text: string }
  | { id: string; from: "customer" | "agent"; kind: "voice"; text: string; audio: DemoAudio }
  | { id: string; from: "agent"; kind: "product"; text: string; product: DemoProduct }
  | { id: string; from: "agent"; kind: "order"; order: DemoOrder }
  | { id: string; from: "customer"; kind: "receipt"; text: string; receipt: DemoReceipt }
  | { id: string; from: "system"; kind: "system"; text: string };

/**
 * Nota de voz. El `text` del mensaje es su TRANSCRIPCIÓN literal: la burbuja
 * la muestra bajo la onda, así que quien no puede o no quiere oír sigue la
 * conversación igual (y el buscador la indexa).
 */
export interface DemoAudio {
  /** Bajo `/assets/`, JAMÁS `/audio/`: el matcher del middleware
   *  (`src/middleware.ts`) no excluye `audio`, así que un visitante sin
   *  sesión recibiría la redirección al login en vez del archivo. */
  src: string;
  /** Duración ya escrita, no leída del archivo: la burbuja debe medir lo
   *  mismo antes y después de cargar los metadatos o el hilo daría un salto. */
  durationLabel: string;
}

export interface DemoProduct {
  name: string;
  meta: string;
  /** Estático local: `public/images/` es la única carpeta que el middleware
   *  deja pasar sin redirigir al login (ver `PUBLIC_PATHS`). */
  imageSrc: string;
  imageAlt: string;
}
export interface DemoOrder {
  id: string;
  amount: string;
  methods: readonly string[];
}
export interface DemoReceipt {
  label: string;
  amount: string;
  time: string;
}

/** Qué demuestra cada mensaje, en lenguaje de dueño de negocio. */
export interface DemoBeat {
  id: string;
  /** Clave del mapa de iconos de la sección (el contenido no importa React). */
  icon: "voice" | "catalog" | "quote" | "promo" | "order" | "payment" | "crm" | "agenda";
  title: string;
  body: string;
  /** Índice del mensaje que lo demuestra. */
  atMessage: number;
  /** Tools reales que lo respaldan. No se renderizan; los verifica el test. */
  tools: readonly string[];
}

const DEMO_TEXTS = {
  totalConFormula: "$309.000",
  totalConCupon: "$278.100",
} as const;

/**
 * Carpeta de los audios de la demo. `/assets/` y no `/audio/`: el matcher del
 * middleware es `/((?!_next|api|favicon.ico|assets|fonts|images).*)` y `audio`
 * NO está excluido, así que en una página pública un visitante sin sesión
 * recibiría un 307 al login en vez del MP3 — y fallaría en silencio.
 */
const DEMO_AUDIO = "/assets/audio";

export const AGENT_DEMO = {
  business: "Óptica Vértice",
  status: "en línea",
  /** Iniciales del avatar del negocio. */
  initials: "V",
  composerPlaceholder: "Escribe un mensaje",
  backLabel: "Volver a la lista de chats",
  messages: [
    /**
     * El intercambio de voz va PRIMERO y es uno solo, por la regla real del
     * producto: el agente responde con nota de voz *solo cuando el cliente le
     * habla con audio* (espejo), y lo que lleva precio, tarjeta o enlace sale
     * en texto. Repartir audios por toda la conversación enseñaría un
     * comportamiento que el producto no tiene.
     */
    {
      id: "d1",
      from: "customer",
      kind: "voice",
      text: "Hola, buenas. Oye, vi en el reel unas gafas negras, de lente naranja… ¿Todavía las tienen?",
      audio: { src: `${DEMO_AUDIO}/cliente-gafas.mp3`, durationLabel: "0:05" },
    },
    {
      id: "d2",
      from: "agent",
      kind: "voice",
      text: "¡Hola! Sí, claro. Todavía nos quedan unas pocas. Son las Aviador Ámbar: montura negra, lente ámbar. Te paso la foto y el precio.",
      audio: { src: `${DEMO_AUDIO}/agente-aviador.mp3`, durationLabel: "0:08" },
    },
    {
      id: "d3",
      from: "agent",
      kind: "product",
      /* La nota de voz acaba de prometer «la foto y el precio»: la tarjeta ES
         esa promesa cumplida, así que el texto solo tiene que entregarla. */
      text: "Aquí las tienes:",
      product: {
        name: "Aviador Ámbar",
        meta: "$189.000 · quedan 4",
        imageSrc: "/images/landing/gafas-aviador-ambar.jpg",
        imageAlt: "Gafas Aviador Ámbar: montura negra con lente naranja",
      },
    },
    { id: "d4", from: "customer", kind: "text", text: "¿Se pueden hacer con mi fórmula?" },
    {
      id: "d5",
      from: "agent",
      kind: "text",
      text: `Montura $189.000 + lente con tu fórmula $120.000. Total: ${DEMO_TEXTS.totalConFormula}, listas en 3 días.`,
    },
    { id: "d6", from: "customer", kind: "text", text: "Tengo el cupón PRIMERAVEZ" },
    {
      id: "d7",
      from: "agent",
      kind: "text",
      text: `Aplicado ✓ PRIMERAVEZ te deja en ${DEMO_TEXTS.totalConCupon}.`,
    },
    {
      id: "d8",
      from: "agent",
      kind: "order",
      order: {
        id: "Pedido #1042",
        amount: DEMO_TEXTS.totalConCupon,
        methods: ["Nequi", "Tarjeta", "PSE"],
      },
    },
    {
      id: "d9",
      from: "customer",
      kind: "receipt",
      text: "Listo, ya pagué",
      receipt: {
        label: "Comprobante · Nequi",
        amount: DEMO_TEXTS.totalConCupon,
        time: "hoy · 9:41 p.m.",
      },
    },
    {
      id: "d10",
      from: "agent",
      kind: "text",
      text: "Pago verificado ✓ Pedido #1042 confirmado. Te aviso cuando estén listas.",
    },
    { id: "d11", from: "system", kind: "system", text: "Contacto guardado · Negocio abierto en el CRM" },
    { id: "d12", from: "customer", kind: "text", text: "¿Y para el examen visual?" },
    {
      id: "d13",
      from: "agent",
      kind: "text",
      text: "Martes 3: 10:00 a.m. o 4:00 p.m. ¿Cuál te dejo?",
    },
  ] as readonly DemoMessage[],
  beats: [
    {
      id: "voz",
      icon: "voice",
      title: "Contesta en voz a quien le habla en voz",
      body: "Si el cliente manda un audio, el agente responde con nota de voz. Lo que lleva precio o tarjeta sigue saliendo en texto.",
      atMessage: 1,
      /* VACÍO A PROPÓSITO: la voz no es una herramienta, es una política de
         respuesta del agente (`voice_enabled`), así que no hay ningún
         `*.tool.ts` que citar sin mentir. */
      tools: [],
    },
    {
      id: "catalogo",
      icon: "catalog",
      title: "Responde con tu catálogo real",
      body: "Consulta stock y precio en el momento y manda la foto. No promete lo que no hay.",
      atMessage: 2,
      tools: ["catalog_lookup", "send_product_images"],
    },
    {
      id: "cotiza",
      icon: "quote",
      title: "Cotiza con tus precios",
      body: "Suma montura, lente y tiempos de entrega con tus reglas — no con una cifra inventada.",
      atMessage: 4,
      tools: ["quote_order"],
    },
    {
      id: "promos",
      icon: "promo",
      title: "Valida cupones y promociones",
      body: "Comprueba que el cupón exista y esté vigente antes de descontar un peso.",
      atMessage: 6,
      tools: ["validate_coupon", "apply_promotion"],
    },
    {
      id: "pedido",
      icon: "order",
      title: "Arma el pedido y cobra",
      body: "Crea el pedido en tu sistema y ofrece tus medios de pago, no un número suelto.",
      atMessage: 7,
      tools: ["create_order", "get_payment_methods"],
    },
    {
      id: "pago",
      icon: "payment",
      title: "Verifica el pago",
      body: "Confirma contra la pasarela. Nadie de tu equipo revisa comprobantes a mano.",
      atMessage: 9,
      tools: ["report_payment", "get_order_status"],
    },
    {
      id: "crm",
      icon: "crm",
      title: "Registra todo en el CRM",
      body: "La conversación deja ficha, negocio y actividad. Sin que nadie digite nada.",
      atMessage: 10,
      tools: ["save_contact_data", "open_deal", "log_crm_activity"],
    },
    {
      id: "agenda",
      icon: "agenda",
      title: "Agenda la cita",
      body: "Consulta tu agenda de verdad y reserva el cupo con recordatorio incluido.",
      atMessage: 12,
      tools: ["book_appointment", "schedule_availability"],
    },
  ] as readonly DemoBeat[],
} as const;

export const AGENT_REVEAL = {
  title: "Una conversación. Una venta cerrada.",
  sub: "De la primera pregunta a la cita agendada, sin que nadie de tu equipo tuviera que abrir el chat.",
  /** Estado del foco antes de que entre el primer beat. */
  introTitle: "Lo que el agente acaba de hacer",
  introBody: "Cada mensaje de la conversación demuestra una capacidad distinta.",
  /** `N de 8` bajo el riel de progreso. */
  progressLabel: (done: number, total: number) => `${done} de ${total}`,
  demoLabel: "Conversación de demostración con un negocio de ejemplo",
  /** Botón que ARMA el audio de la escena. Ver `ProductosAgentReveal`: el
   *  scroll no desbloquea sonido en ningún navegador, hace falta un clic. */
  soundArmLabel: "Activar sonido",
  soundOnLabel: "Sonido activado",
  soundHint: "Escucha cómo suena el agente",
  voicePlayLabel: "Reproducir nota de voz",
  voicePauseLabel: "Pausar nota de voz",
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
