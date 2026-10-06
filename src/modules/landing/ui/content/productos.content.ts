/**
 * Contenido completo de `/productos`: «Escríbele. Mira cómo vende.»
 * (plan `docs/plans/productos_juego_plan.md`, lienzo aprobado por la dueña el
 * 2026-10-03).
 *
 * REGLA (la misma de `landing.content.ts`): ninguna sección hardcodea texto,
 * cifras ni URLs; todo sale de aquí.
 *
 * Honestidad (revisada contra `qa/evidencia/productos-ref/INVENTARIO.md`):
 * - El juego tiene GUION. Nunca se llama «en vivo» ni promete que «responde
 *   de verdad»: lo real son los audios y las habilidades que enseña.
 * - Cada habilidad declara las herramientas reales del agente que la
 *   respaldan (`AGENT_TOOLS`); un test lo verifica.
 * - No hay pasarela de pago: el pago lo verifica una persona. No hay factura
 *   electrónica: hay documentos. El cierre de pedidos con variantes no se
 *   promete (solo el catálogo con SKU y stock).
 * - Las notas de la demo («el 30 % no existe», «guardado en el CRM») nunca van
 *   dentro del chat del cliente: las dice la isla.
 * - Óptica Vértice es un negocio FICTICIO, el mismo de la versión anterior.
 */

/* ───────────────────────────── Enlaces y anclas ───────────────────────────── */

/**
 * Las anclas de la página. Los enlaces del menú y del pie apuntan a estas; el
 * test `productos-anchors` comprueba que todas existan en la página
 * renderizada. Renombrar una exige actualizar `site-nav.content.ts`.
 */
export const PRODUCTOS_ANCHORS = {
  hero: "inicio",
  game: "agente",
  /** «Lo que no cerraste hoy»: la recuperación (plan productos_tinta §4.4). */
  recover: "recuperar",
  pieces: "piezas",
  video: "video",
  price: "precio",
  control: "control",
  close: "empezar",
} as const;

/**
 * Anclas viejas (o de campañas) que no son una escena: el router de hash las
 * resuelve hacia la escena que hoy las cuenta. `reconocimiento` resalta la
 * jugada de la foto dentro del juego.
 */
export const PRODUCTOS_ALIASES: Readonly<Record<string, { scene: string; move?: GameMoveId }>> = {
  reconocimiento: { scene: PRODUCTOS_ANCHORS.game, move: "foto" },
};

/** La conversión única de la página (D6), con su origen para medir. */
export const PRODUCTOS_TRIAL = {
  label: "Prueba 7 días gratis",
  href: "/comenzar?plan=free_trial&origen=productos",
  micro: "Sin tarjeta. Tu cuenta queda lista hoy.",
} as const;

/* ─────────────────────── Las 18 herramientas reales ──────────────────────── */

/**
 * Nombres literales del registro del backend
 * (`ai_agents/application/tools/*.tool.ts`). No se renderizan —son
 * vocabulario de desarrollador— pero son el respaldo de cada habilidad del
 * juego. Va antes que todo lo que lo consume.
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
export type AgentTool = (typeof AGENT_TOOLS)[number];

/* ─────────────────────────────── 1 · Apertura ─────────────────────────────── */

export const PRODUCTOS_HERO = {
  strong: "Escríbele.",
  thin: "Mira cómo vende.",
  /** Qué es Axi, en una frase, para quien llega por un anuncio. «Canales digitales», como la home: no solo WhatsApp. */
  lead: "Un agente que vende por tus canales digitales con tu catálogo, tus precios y tu equipo al lado. Juega a ser tu cliente y compruébalo.",
  play: { label: "Jugar ahora", href: `#${PRODUCTOS_ANCHORS.game}` },
  /** El saludo del teléfono que asoma desde la luz. */
  greeting: "Hola, soy Vera. ¿Qué estás buscando?",
} as const;

/* ─────────────────────── 2 · Juega a ser tu cliente ──────────────────────── */

export type GameTone = "coral" | "violet" | "amber";
export type GameAbilityId = "foto" | "voz" | "descuento" | "compra" | "agenda" | "persona" | "crm";
export type GameMoveId = Exclude<GameAbilityId, "crm">;

export interface GameAbility {
  id: GameAbilityId;
  name: string;
  /** Qué hace, en una línea de dueño de negocio. */
  line: string;
  tone: GameTone;
  /** Herramientas reales que la respaldan. No se renderizan; las verifica el test. */
  tools: readonly AgentTool[];
}

/** Nota de voz: el texto es su transcripción literal (se lee sin oír). */
export interface GameAudio {
  /** Bajo `/assets/`: el matcher del middleware deja pasar esa carpeta y no `/audio/`. */
  src: string;
  /** Escrita, no leída del archivo: la burbuja mide lo mismo antes y después de cargar. */
  duration: string;
}

export type GameMessage =
  | { kind: "text"; from: "customer" | "agent" | "human"; text: string; author?: string }
  | { kind: "photo"; from: "customer"; imageSrc: string; imageAlt: string; caption: string }
  | { kind: "voice"; from: "customer" | "agent"; text: string; audio: GameAudio }
  | { kind: "card"; from: "agent" | "customer"; kicker: string; title: string; meta: string; imageSrc?: string; imageAlt?: string }
  | { kind: "event"; text: string; tone: GameTone | "ok" };

export interface GameMove {
  id: GameMoveId;
  label: string;
  /** La pista corta bajo el nombre de la jugada. */
  hint: string;
  /** Lo que escribe el visitante (el cliente). */
  customer: readonly GameMessage[];
  /** Lo que responde Axi (o el equipo), tras el «escribiendo…». */
  reply: readonly GameMessage[];
}

/** El logo del negocio de ejemplo: el mismo en el chat del juego y en la ventana del panel. */
const BUSINESS_LOGO = "/images/landing/optica-vertice-logo.png";

const PRODUCT_IMAGE = "/images/landing/gafas-aviador-ambar.jpg";
/**
 * Fotos de licencia libre (Unsplash), encuadradas y con la marca ajena
 * difuminada. La del cliente es casera a propósito: el reconocimiento por foto
 * vale justo cuando no se parece a la del catálogo (pedido de la dueña).
 */
const PHOTOS = "/images/landing/productos";
const CUSTOMER_PHOTO = `${PHOTOS}/cliente-foto-piscina.jpg`;
const AVIADOR_DORADO = `${PHOTOS}/aviador-dorado-ambar.jpg`;
const AUDIO = "/assets/audio";

export const GAME_ABILITIES: readonly GameAbility[] = [
  { id: "foto", name: "Reconoce fotos", line: "Encuentra el producto en tu catálogo", tone: "violet", tools: ["catalog_lookup", "send_product_images"] },
  { id: "voz", name: "Habla y escucha", line: "Responde en voz por WhatsApp", tone: "violet", tools: ["catalog_lookup"] },
  { id: "descuento", name: "Cuida tu margen", line: "Solo los descuentos que autorizas", tone: "coral", tools: ["validate_coupon", "apply_promotion", "quote_order"] },
  { id: "compra", name: "Pedido y pago en el chat", line: "Comprobante que verifica tu equipo", tone: "coral", tools: ["create_order", "get_payment_methods", "report_payment"] },
  { id: "agenda", name: "Agenda citas", line: "Sobre tu horario, y le recuerda", tone: "coral", tools: ["schedule_availability", "book_appointment"] },
  { id: "persona", name: "Llama a tu equipo", line: "Una persona entra cuando hace falta", tone: "amber", tools: ["human_handoff"] },
  { id: "crm", name: "Anota en tu CRM", line: "Sin que nadie digite nada", tone: "amber", tools: ["save_contact_data", "open_deal", "log_crm_activity"] },
];

export const GAME_MOVES: readonly GameMove[] = [
  {
    id: "foto",
    label: "Mándale una foto",
    hint: "Una foto que tomó",
    customer: [
      { kind: "photo", from: "customer", imageSrc: CUSTOMER_PHOTO, imageAlt: "Foto casera de unas gafas aviador de lente ámbar sobre el borde de una piscina", caption: "Foto del cliente" },
      { kind: "text", from: "customer", text: "¿Tienen estas?" },
    ],
    reply: [
      { kind: "text", from: "agent", text: "Sí, son las Aviador Ámbar en dorado. Nos quedan 7." },
      { kind: "card", from: "agent", kicker: "De tu catálogo", title: "Aviador Ámbar · Dorado", meta: "$189.000 · quedan 7", imageSrc: AVIADOR_DORADO, imageAlt: "Gafas Aviador Ámbar con montura dorada, foto de catálogo" },
    ],
  },
  {
    id: "voz",
    label: "Háblale",
    hint: "Una nota de voz",
    customer: [
      {
        kind: "voice",
        from: "customer",
        text: "Hola, buenas. Oye, vi en el reel unas gafas negras, de lente naranja… ¿Todavía las tienen?",
        audio: { src: `${AUDIO}/cliente-gafas.mp3`, duration: "0:05" },
      },
    ],
    reply: [
      {
        kind: "voice",
        from: "agent",
        text: "¡Hola! Sí, claro. Todavía nos quedan unas pocas. Son las Aviador Ámbar: montura negra, lente ámbar. Te paso la foto y el precio.",
        audio: { src: `${AUDIO}/agente-aviador.mp3`, duration: "0:08" },
      },
    ],
  },
  {
    id: "descuento",
    label: "Pídele un 30 %",
    hint: "Negocia el precio",
    customer: [{ kind: "text", from: "customer", text: "¿Me las dejas un 30 % más baratas?" }],
    reply: [{ kind: "text", from: "agent", text: "Eso no lo tengo autorizado. Con el cupón PRIMERAVEZ te quedan en $170.100." }],
  },
  {
    id: "compra",
    label: "Cómpralas",
    hint: "Pide y paga en el chat",
    customer: [{ kind: "text", from: "customer", text: "Me las llevo" }],
    reply: [
      { kind: "card", from: "agent", kicker: "Pedido #1042", title: "$170.100", meta: "Nequi · Bancolombia" },
      { kind: "card", from: "customer", kicker: "Comprobante", title: "Nequi · $170.100", meta: "Listo, ya pagué" },
      { kind: "event", text: "Pago reportado · lo verifica tu equipo", tone: "ok" },
    ],
  },
  {
    id: "agenda",
    label: "Pide una cita",
    hint: "El examen visual",
    customer: [{ kind: "text", from: "customer", text: "¿Me hacen el examen visual?" }],
    reply: [{ kind: "text", from: "agent", text: "Claro. El martes 3 tengo 10:00 a. m. o 4:00 p. m. Te lo recuerdo antes." }],
  },
  {
    id: "persona",
    label: "Pide una persona",
    hint: "Que te atienda alguien",
    customer: [{ kind: "text", from: "customer", text: "Prefiero hablar con una persona" }],
    reply: [
      { kind: "event", text: "Laura entró a la conversación", tone: "amber" },
      { kind: "text", from: "human", author: "Laura", text: "Hola, soy Laura. Te ayudo con gusto." },
    ],
  },
];

export const GAME = {
  business: "Óptica Vértice",
  day: "Hoy",
  read: "leído",
  /** Decorativo (`alt` vacío): el nombre va escrito al lado. */
  avatar: { src: BUSINESS_LOGO, alt: "" },
  online: "agente en línea",
  typing: "escribiendo…",
  greeting: PRODUCTOS_HERO.greeting,
  composer: "Elige tu jugada",
  island: {
    title: "Juega a ser tu cliente",
    count: (n: number, total: number) => `${n} de ${total} habilidades`,
    discovered: (name: string) => `Descubriste: ${name}`,
    now: "ahora",
  },
  /** La cabecera visible de la columna de jugadas. */
  heading: { eyebrow: "Juega a ser tu cliente", strong: "Tú escribes.", thin: "Axi atiende." },
  abilitiesTitle: "Habilidades",
  movesTitle: "Tu jugada",
  movesSub: "Toca una. Puedes ir en cualquier orden.",
  /** La isla de tinta «Lo que acabas de ver» (brillo de IA: cuenta lo que hizo el agente). */
  note: {
    kicker: "Lo que acabas de ver",
    intro: { title: "Empieza por una jugada", text: "Escríbele como lo haría tu cliente. Aquí verás qué hizo Axi y con qué parte de tu negocio lo resolvió.", uses: [] as readonly string[] },
    uses: "Usó",
  },
  progress: { of: "de 7", label: "habilidades" },
  /** La habilidad del CRM se descubre sola tras estas jugadas. */
  crmAfterMoves: 3,
  done: { strong: "7 de 7.", thin: "Ahora, con tu catálogo.", replay: "Jugar otra vez" },
  playVoice: "Escuchar nota de voz",
  pauseVoice: "Pausar nota de voz",
  chatLabel: "Chat de ejemplo con Óptica Vértice",
  /** Para lectores de pantalla y buscadores: el juego tiene guion. */
  disclaimer: "Demostración con guion: las respuestas son de ejemplo y las notas de voz son reales.",
} as const;

/**
 * Lo que cuenta la isla tras cada respuesta. Fuera del chat del cliente: la
 * demo explica, el chat no (regla de la página).
 */
export const GAME_NOTES: Readonly<Record<GameAbilityId, { title: string; text: string; uses: readonly string[] }>> = {
  foto: { title: "Reconoce fotos", text: "Encontró la referencia exacta en tu catálogo y dijo cuántas quedan. Si duda, muestra hasta tres opciones.", uses: ["Catálogo", "Stock"] },
  voz: { title: "Habla y escucha", text: "Entiende la nota de voz y responde con voz, con una de diez voces latinas. Solo por WhatsApp.", uses: ["Voz", "Catálogo"] },
  descuento: { title: "Cuida tu margen", text: "El 30 % no existe. Ofreció el único cupón que autorizaste, con el precio calculado por el sistema.", uses: ["Cupones", "Precios"] },
  compra: { title: "Pedido y pago en el chat", text: "Creó el pedido con su número y guardó el comprobante. Una persona de tu equipo confirma el pago.", uses: ["Pedidos", "Medios de pago"] },
  agenda: { title: "Agenda citas", text: "Ofrece solo horas libres de tu agenda y deja programados los recordatorios de 24 h y 1 h antes.", uses: ["Agenda", "Recordatorios"] },
  persona: { title: "Llama a tu equipo", text: "Laura entró a la misma conversación y Axi dejó de escribir. Puede devolvérsela con una nota.", uses: ["Bandeja", "Equipo"] },
  crm: { title: "Anota en tu CRM", text: "Sin que nadie digite: Valentina R. ya es una oportunidad en Cotizado, con el producto y el valor.", uses: ["CRM", "Contactos"] },
};

/* ─────────────────── 2b · Lo que no cerraste hoy (recuperar) ─────────────────── */

/**
 * El diferenciador, con el copy de la dueña (2026-10-06). Los tres
 * disparadores son los de `/marketing/automations` (INVENTARIO §1.9) y los
 * mensajes siguen a los clientes de las piezas (el carrito es de una clienta
 * nueva: el #1042 del juego ya está pagado). La recuperación
 * NO está en Esencial: la página lo dice al pie (INVENTARIO §2.3).
 */
export const RECOVER = {
  strong: "Lo que no cerraste hoy,",
  thin: "Axi lo vuelve a buscar.",
  lead: "Detecta conversaciones que se enfriaron, carritos abandonados y oportunidades que quedaron a medias.",
  /** La marca de ejemplo, como «Datos de ejemplo» en las piezas. */
  sample: "Mensajes de ejemplo",
  writes: "Axi le escribe",
  triggers: [
    {
      id: "carrito",
      kicker: "Carrito abandonado",
      title: "Armó un pedido y no lo terminó.",
      context: { label: "Pedido #1051", detail: "Redonda Titanio · $248.000", state: "Sin pagar" },
      when: "hace 1 día",
      message: "Hola, Camila. Tu pedido de las Redonda Titanio quedó a medias. ¿Te ayudo a terminarlo?",
    },
    {
      id: "frio",
      kicker: "Conversación que se enfrió",
      title: "Preguntó, le respondimos y no volvió.",
      context: { label: "Cotización", detail: "Progresivos · $520.000", state: "Sin respuesta" },
      when: "hace 3 días",
      message: "Hola, Pedro. ¿Pudiste ver la cotización de los progresivos? Si quieres, te agendo el examen.",
    },
    {
      id: "trato",
      kicker: "Oportunidad a medias",
      title: "Un trato del CRM lleva días sin moverse.",
      context: { label: "Compromiso", detail: "Examen + montura · $412.000", state: "6 días quieto" },
      when: "hoy",
      message: "Hola, Andrés. Seguimos con tu examen y la montura cuando quieras. ¿Te sirve el jueves?",
    },
  ],
  closing: { strong: "No vuelvas a empezar una venta.", thin: "Retómala donde quedó." },
  label: "Mensaje de ejemplo de Axi",
} as const;

/* ─────────────────────────── 3 · Pieza por pieza ─────────────────────────── */

/**
 * Contrato con «Pieza por pieza» (F3, construye cinematic-landing-page). Cada
 * pieza es una `<section id={id}>` dentro de `#piezas`; el router de hash
 * despacha `productos:piece` con `{ id }`. Los textos de cada pantalla
 * recreada son los del panel real (INVENTARIO §1) y viven en `screen`.
 */
export type PieceId = "inbox" | "configura" | "catalogo" | "crm" | "llamadas" | "cobros" | "medicion";

export interface Piece {
  id: PieceId;
  /** El nombre en el dock. */
  tab: string;
  tone: GameTone;
  strong: string;
  thin: string;
  /** Qué hace por ti, en una línea bajo el titular. */
  line: string;
  /** Lleva la marca «Datos de ejemplo» junto al título (D3). */
  sample: boolean;
}

export const PIECES_SCENE = {
  eyebrow: "Pieza por pieza",
  sampleLabel: "Datos de ejemplo",
  tablistLabel: "Piezas del producto",
  /** El evento con el que el router abre una pieza. */
  event: "productos:piece",
  /** La isla del nav mientras la escena está en pantalla: «Pieza por pieza · Cobros · 6 de 7». */
  island: { title: "Pieza por pieza", sub: (tab: string, n: number, total: number) => `${tab} · ${n} de ${total}` },
} as const;

/**
 * La ventana del panel que enmarca cada pieza (AppShell): la barra lateral de
 * la app con el negocio de ejemplo y la sección activa de cada pieza. Los
 * nombres de sección son los del menú real del panel.
 */
const ICON = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  inbox: "M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 13h5l1 3h6l1-3h5",
  bot: "M12 3v3M5 9h14v10H5zM9 14h.01M15 14h.01M2 13v3M22 13v3",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  kanban: "M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v13h-4z",
  package: "M21 8 12 3 3 8v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8",
  wallet: "M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-3v3M17 14h.01",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2zM10 21h4",
} as const;

export const APP_SHELL = {
  business: "Óptica Vértice",
  logo: { src: BUSINESS_LOGO },
  role: "Dueña",
  me: { name: "Laura Arango", mail: "laura@opticavertice.co" },
  crumbRoot: "Workspace",
  search: "Buscar",
  searchIcon: ICON.search,
  bellIcon: ICON.bell,
  home: { label: "Inicio", icon: ICON.home },
  groups: [
    {
      label: "Atender",
      items: [
        { label: "Inbox", icon: ICON.inbox, piece: "inbox", badge: "7" },
        { label: "Agentes", icon: ICON.bot, piece: "configura" },
        { label: "Llamadas", icon: ICON.phone, piece: "llamadas" },
      ],
    },
    {
      label: "Vender",
      items: [
        { label: "CRM", icon: ICON.kanban, piece: "crm" },
        { label: "Catálogo", icon: ICON.package, piece: "catalogo" },
        { label: "Cartera", icon: ICON.wallet, piece: "cobros" },
      ],
    },
    {
      label: "Medir",
      items: [{ label: "Analítica", icon: ICON.chart, piece: "medicion" }],
    },
  ] as readonly { label: string; items: readonly { label: string; icon: string; piece?: PieceId; badge?: string }[] }[],
} as const;

export const PIECES: readonly Piece[] = [
  { id: "inbox", tab: "Bandeja", tone: "violet", strong: "Todo tu chat.", thin: "Una sola bandeja.", line: "Axi atiende y, cuando hace falta, te pasa la conversación con su motivo. Tú la tomas con un toque.", sample: true },
  { id: "configura", tab: "Agente", tone: "violet", strong: "Lo configuras.", thin: "No lo programas.", line: "Cara, voz y reglas en minutos. Las reglas las escribes como se las dirías a un vendedor nuevo.", sample: false },
  { id: "catalogo", tab: "Catálogo", tone: "coral", strong: "Tu catálogo,", thin: "entendido.", line: "Variantes, SKU y stock. El agente encuentra el producto aunque el cliente escriba mal.", sample: true },
  { id: "crm", tab: "CRM", tone: "coral", strong: "Cada conversación,", thin: "una oportunidad.", line: "Axi abre la oportunidad y la mueve de etapa. Tú ves cuáles se enfrían antes de perderlas.", sample: true },
  { id: "llamadas", tab: "Llamadas", tone: "violet", strong: "Cuando hay que llamar,", thin: "llama.", line: "Llama desde tu número para retomar cotizaciones, confirmar citas o cobrar, y te deja el resumen.", sample: true },
  { id: "cobros", tab: "Cobros", tone: "amber", strong: "Te deben.", thin: "Axi te dice a quién primero.", line: "Cuotas, promesas y recordatorios. La cartera se ordena por a quién escribir hoy.", sample: true },
  { id: "medicion", tab: "Medición", tone: "amber", strong: "Ventas en pesos.", thin: "No mensajes.", line: "El embudo termina en dinero pagado, y una IA supervisora te dice qué corregir.", sample: true },
];

/**
 * Las siete pantallas recreadas. Las etiquetas, estados y botones son los del
 * panel real (INVENTARIO §1, copiados del cliente); los nombres y las cifras
 * son de ejemplo, y por eso esas piezas llevan `sample`. Las cifras cuadran
 * entre sí (la cartera suma lo que dice «Te deben», la calidad es la media de
 * sus cuatro notas) para que nadie que mire de cerca encuentre un truco.
 */
export type ScreenTone = GameTone | "ok" | "muted";

export interface PieceScreens {
  inbox: {
    title: string;
    folders: readonly { label: string; count: number; on?: boolean }[];
    channelsLabel: string;
    channels: readonly { label: string; note?: string }[];
    listTitle: string;
    listSub: string;
    search: string;
    rows: readonly { initials: string; name: string; preview: string; time: string; holder: string; tone: ScreenTone; unread?: number; on?: boolean }[];
    head: { initials: string; name: string; channel: string };
    day: string;
    thread: readonly { from: "customer" | "agent"; text: string; time: string }[];
    events: readonly string[];
    claim: { label: string; action: string };
    footer: string;
    actions: readonly string[];
  };
  configura: {
    title: string;
    sub: string;
    create: string;
    agents: readonly {
      name: string;
      status: string;
      statusTone: ScreenTone;
      role: string;
      character: "nova" | "strobi" | "cloudee";
      color: "coral" | "mint" | "cloud" | "violet" | "amber";
      expression: "proud" | "curious" | "neutral";
      channel: string;
      voice: string;
    }[];
    createCard: { title: string; sub: string };
  };
  catalogo: {
    title: string;
    sub: string;
    products: readonly { name: string; price: string; stock: string; imageSrc: string; on?: boolean; out?: boolean }[];
    name: string;
    price: string;
    category: string;
    imageSrc: string;
    imageAlt: string;
    variantsLabel: string;
    columns: readonly [string, string, string];
    variants: readonly { name: string; sku: string; stock: string; out: boolean; imageSrc?: string }[];
    readiness: string;
    search: { label: string; typed: string; found: string };
  };
  crm: {
    title: string;
    pipeline: string;
    sub: string;
    views: readonly string[];
    summaryAction: string;
    newAction: string;
    forecast: { label: string; value: string; of: string; ratio: number };
    won: { label: string; value: string; note: string };
    rate: { label: string; value: string; note: string };
    next: { kicker: string; title: string; text: string; action: string };
    stages: readonly {
      name: string;
      prob: string;
      count: number;
      total: string;
      deals: readonly { name: string; initials: string; value: string; product: string; note?: string; stale?: boolean; byAxi?: boolean }[];
    }[];
    byAxi: string;
  };
  /** La llamada terminada, como `FinishedCallView` del panel (llamadas premium F4). */
  llamadas: {
    back: string;
    who: string;
    result: string;
    meta: string;
    action: string;
    recording: { title: string; agent: string; caller: string; at: string; total: string; rates: readonly string[] };
    transcriptLabel: string;
    transcript: readonly { role: "agent" | "caller"; clock: string; text: string }[];
    summary: {
      kicker: string;
      title: string;
      text: string;
      reachedLabel: string;
      reached: string;
      of: string;
      stages: readonly { label: string; note?: string }[];
      verdict: string;
      reason: string;
      foot: string;
    };
  };
  cobros: {
    title: string;
    views: readonly string[];
    owedLabel: string;
    owed: string;
    overdueLabel: string;
    overdue: string;
    summary: string;
    order: string;
    island: { kicker: string; name: string; amount: string; why: string; facts: readonly { label: string; value: string }[]; actions: readonly string[] };
    groups: readonly { label: string; tone: ScreenTone }[];
    write: string;
    rows: readonly { initials: string; name: string; concept: string; ref: string; amount: string; state: string; tone: ScreenTone; group: number }[];
  };
  medicion: {
    title: string;
    sub: string;
    tabs: readonly string[];
    salesLabel: string;
    sales: string;
    flow: string;
    salesNote: string;
    funnelLabel: string;
    funnel: readonly { label: string; value: number }[];
    qualityLabel: string;
    quality: number;
    qualityOf: string;
    qualityNote: string;
    subscores: readonly { label: string; value: number }[];
    fixLabel: string;
    fixes: readonly string[];
    fixCounts: readonly string[];
  };
}

export const PIECE_SCREENS: PieceScreens = {
  inbox: {
    title: "Inbox",
    folders: [
      { label: "En cola", count: 3, on: true },
      { label: "Contigo", count: 5 },
      { label: "Axi atiende", count: 12 },
      { label: "Todas abiertas", count: 24 },
      { label: "Cerradas", count: 0 },
    ],
    channelsLabel: "Canales",
    channels: [{ label: "WhatsApp Ventas" }, { label: "WhatsApp Taller", note: "Exámenes y entregas" }],
    listTitle: "En cola",
    listSub: "3 esperan a alguien del equipo",
    search: "Buscar por nombre o teléfono",
    rows: [
      { initials: "AM", name: "Andrés M.", preview: "Prefiero hablar con una persona", time: "9:28", holder: "En cola · 2 min", tone: "amber", unread: 1, on: true },
      { initials: "PN", name: "Pedro N.", preview: "¿Hacen progresivos?", time: "9:21", holder: "En cola · 9 min", tone: "amber", unread: 2 },
      { initials: "LC", name: "Lucía C.", preview: "Necesito cambiar la cita", time: "9:02", holder: "En cola · 28 min", tone: "coral" },
    ],
    head: { initials: "AM", name: "Andrés M.", channel: "WhatsApp Ventas" },
    day: "Hoy",
    thread: [
      { from: "customer", text: "¿Me las dejas más baratas?", time: "9:26" },
      { from: "agent", text: "Con el cupón PRIMERAVEZ te quedan en $170.100.", time: "9:26" },
      { from: "customer", text: "Prefiero hablar con una persona", time: "9:28" },
    ],
    events: ["Axi pasó la conversación al equipo: el cliente pidió hablar con una persona · 9:28", "Lleva 2 min en cola; si nadie la toma en 5, sube de prioridad"],
    claim: { label: "Axi te la pasó · 2 min", action: "Atender" },
    footer: "Atiéndela para responder. Axi ya no le escribe.",
    actions: ["Devolver a Axi", "Marcar como resuelta"],
  },
  configura: {
    title: "Agentes",
    sub: "Cada agente tiene una cara, una voz y unas reglas. Los canales deciden con cuál atienden.",
    create: "Crear agente",
    agents: [
      { name: "Vera", status: "Activo", statusTone: "ok", role: "Vende y toma pedidos", character: "nova", color: "coral", expression: "proud", channel: "Ventas · WhatsApp", voice: "Con voz" },
      { name: "Sofía", status: "Activo", statusTone: "ok", role: "Gestiona la agenda", character: "strobi", color: "mint", expression: "curious", channel: "Taller · WhatsApp", voice: "Con voz" },
      { name: "Mateo", status: "Borrador", statusTone: "muted", role: "Atiende soporte", character: "cloudee", color: "cloud", expression: "neutral", channel: "Sin canal asignado", voice: "Sin voz" },
    ],
    createCard: { title: "Crear agente", sub: "Personaje, voz y reglas en cinco minutos" },
  },
  catalogo: {
    title: "Catálogo",
    sub: "38 productos · 4 categorías · tu agente los busca aunque escriban mal",
    products: [
      { name: "Aviador Ámbar", price: "$189.000", stock: "11 en stock", imageSrc: PRODUCT_IMAGE, on: true },
      { name: "Clubmaster Carey", price: "$215.000", stock: "6 en stock", imageSrc: `${PHOTOS}/clubmaster-carey.jpg` },
      { name: "Redonda Titanio", price: "$248.000", stock: "3 en stock", imageSrc: `${PHOTOS}/redonda-titanio.jpg` },
      { name: "Wayfarer Negra", price: "$169.000", stock: "Agotado", imageSrc: `${PHOTOS}/wayfarer-negra.jpg`, out: true },
    ],
    name: "Aviador Ámbar",
    price: "$189.000",
    category: "Monturas de sol",
    imageSrc: PRODUCT_IMAGE,
    imageAlt: "Gafas Aviador Ámbar",
    variantsLabel: "Variantes y stock (3)",
    columns: ["Variante", "SKU", "Stock"],
    variants: [
      { name: "Negro / Ámbar", sku: "AV-NA-01", stock: "4 · disponible", out: false, imageSrc: PRODUCT_IMAGE },
      { name: "Dorado / Ámbar", sku: "AV-DA-02", stock: "7 · disponible", out: false, imageSrc: AVIADOR_DORADO },
      { name: "Plata / Gris", sku: "AV-PG-03", stock: "agotado", out: true },
    ],
    readiness: "Plata / Gris está agotada · tu agente ofrece las demás",
    search: { label: "Búsqueda con IA", typed: "aviadro ambar", found: "Aviador Ámbar" },
  },
  crm: {
    title: "Pipeline",
    pipeline: "Ventas",
    sub: "12 oportunidades abiertas · $ 3,6 M en juego · arrastra una tarjeta para cambiarla de etapa",
    views: ["Tablero", "Tabla"],
    summaryAction: "Resumen de Axi",
    newAction: "Nueva oportunidad",
    forecast: { label: "Pronóstico ponderado", value: "$ 1,4 M", of: "de $ 3,6 M", ratio: 0.38 },
    won: { label: "Ganadas · septiembre", value: "9", note: "$ 2,4 M ganados" },
    rate: { label: "Tasa de cierre · septiembre", value: "32 %", note: "9 de 28 que llegaron a cotizar" },
    next: { kicker: "Lo próximo", title: "2 se enfrían", text: "Llevan más días de los que aguanta su etapa. La primera: Andrés M., 6 días en Compromiso.", action: "Ver la primera" },
    stages: [
      {
        name: "Nuevo", prob: "10 %", count: 6, total: "$ 1,1 M",
        deals: [
          { name: "Juan P.", initials: "JP", value: "$ 380.000", product: "Monturas niño", byAxi: true },
          { name: "Sara L.", initials: "SL", value: "$ 240.000", product: "Lentes de contacto" },
        ],
      },
      {
        name: "Cotizado", prob: "40 %", count: 4, total: "$ 1,6 M",
        deals: [
          { name: "Valentina R.", initials: "VR", value: "$ 170.100", product: "Aviador Ámbar + fórmula", note: "Entró hoy a la etapa", byAxi: true },
          { name: "Pedro N.", initials: "PN", value: "$ 520.000", product: "Progresivos" },
        ],
      },
      {
        name: "Compromiso", prob: "70 %", count: 2, total: "$ 0,9 M",
        deals: [{ name: "Andrés M.", initials: "AM", value: "$ 412.000", product: "Examen + montura", note: "6 días sin moverse", stale: true }],
      },
      {
        name: "Ganado", prob: "100 %", count: 9, total: "$ 2,4 M",
        deals: [{ name: "Lucía C.", initials: "LC", value: "$ 189.000", product: "Aviador Ámbar" }],
      },
    ],
    byAxi: "La abrió Axi",
  },
  llamadas: {
    back: "Historial",
    who: "Andrés M.",
    result: "Objetivo cumplido",
    meta: "+57 300 555 0142 · Retomar cotización · saliente · hoy",
    action: "Ver contacto",
    recording: { title: "Grabación", agent: "Vera (IA)", caller: "Andrés", at: "0:26", total: "2:14", rates: ["1×", "1,5×", "2×"] },
    transcriptLabel: "Conversación",
    transcript: [
      { role: "agent", clock: "0:02", text: "Hola, Andrés. Te habla Vera, de Óptica Vértice. ¿Tienes un minuto?" },
      { role: "caller", clock: "0:07", text: "Sí, dime." },
      { role: "agent", clock: "0:10", text: "Te llamo por la cotización del examen y la montura. Esta semana tengo cita el jueves a las 4:00 p. m." },
      { role: "caller", clock: "0:21", text: "El jueves me sirve. ¿Me mandas el pedido por WhatsApp?" },
      { role: "agent", clock: "0:26", text: "Claro, te lo envío ahora mismo." },
    ],
    summary: {
      kicker: "Así fue la llamada",
      title: "Objetivo cumplido",
      text: "Andrés retomó la cotización del examen y la montura. Quedó para el jueves a las 4:00 p. m. y pidió el pedido por WhatsApp.",
      reachedLabel: "Llegó a",
      reached: "Cierre",
      of: "4 de 4",
      stages: [{ label: "Apertura" }, { label: "Motivo" }, { label: "Propuesta" }, { label: "Cierre", note: "Aquí se cumplió el objetivo" }],
      verdict: "Meta cumplida · confianza alta",
      reason: "Aceptó la cita y pidió el pedido por WhatsApp.",
      foot: "Resumen escrito por Axi al colgar",
    },
  },
  cobros: {
    title: "Cartera",
    views: ["Todo", "En mora"],
    owedLabel: "Te deben",
    owed: "$ 3,4 M",
    overdueLabel: "Vencido",
    overdue: "$ 820.000",
    summary: "4 clientes con saldo. $ 820.000 ya venció y $ 128.100 tiene promesa para el viernes.",
    order: "Ordenada por a quién escribir primero, no por nombre ni por monto.",
    island: {
      kicker: "Escribe primero a",
      name: "Andrés M.",
      amount: "$ 820.000",
      why: "Lleva 4 días en mora; el recordatorio de ayer sigue sin respuesta.",
      facts: [
        { label: "Venció", value: "hace 4 días" },
        { label: "Último aviso", value: "ayer · recordatorio automático" },
      ],
      actions: ["Escribirle", "Anotar promesa"],
    },
    groups: [
      { label: "En mora", tone: "coral" },
      { label: "Por vencer", tone: "amber" },
      { label: "Al día", tone: "ok" },
    ],
    write: "Escribir",
    rows: [
      { initials: "AM", name: "Andrés M.", concept: "Cuota 2 de 3", ref: "#1031", amount: "$ 820.000", state: "En mora · 4 días", tone: "coral", group: 0 },
      { initials: "VR", name: "Valentina R.", concept: "Saldo", ref: "#1042", amount: "$ 128.100", state: "Promesa viva · viernes", tone: "violet", group: 1 },
      { initials: "JP", name: "Juan P.", concept: "Cuota 1 de 2", ref: "#1036", amount: "$ 1.250.000", state: "Vence el jue 9", tone: "amber", group: 1 },
      { initials: "SL", name: "Sara L.", concept: "Saldo", ref: "#1028", amount: "$ 1.201.900", state: "Al día · vence en 20 días", tone: "ok", group: 2 },
    ],
  },
  medicion: {
    title: "Analítica",
    sub: "Septiembre · todos los canales y agentes",
    tabs: ["Conversión", "Calidad", "Alertas"],
    salesLabel: "Ventas pagadas · septiembre",
    sales: "$ 48,6 M",
    flow: "1.240 conversaciones → 171 pagadas",
    salesNote: "Si una persona cerró la venta tras un relevo, cuenta para tu negocio, no para Axi.",
    funnelLabel: "Embudo de ventas",
    funnel: [
      { label: "Con intención", value: 612 },
      { label: "Pedidos creados", value: 268 },
      { label: "Pedidos confirmados", value: 204 },
      { label: "Pedidos pagados", value: 171 },
    ],
    qualityLabel: "Calidad general",
    quality: 86,
    qualityOf: "de 100",
    qualityNote: "Juicio de una IA supervisora sobre conversaciones cerradas, no contabilidad.",
    subscores: [
      { label: "Precisión", value: 91 },
      { label: "Uso de datos", value: 88 },
      { label: "Cierre de venta", value: 74 },
      { label: "Tono", value: 92 },
    ],
    fixLabel: "Qué corregir primero",
    fixes: ["Cierre no intentado", "Ignoró el inventario"],
    fixCounts: ["14 conversaciones", "6 conversaciones"],
  },
};

/* ──────────────────────────────── 4 · El video ──────────────────────────────── */

const CLOUDINARY_VIDEO = "https://res.cloudinary.com/dpfnxj52w/video/upload";

/**
 * El video del fundador y CTO (D5): antes abría la página; ahora va antes del
 * cierre. Streaming progresivo con `q_90` (nunca `q_auto`, que dejaba el
 * video blando: medido 1,09 frente a 3,11 Mbps). Dos másteres: el horizontal
 * para el marco de escritorio y el vertical para móvil, cada uno con su póster.
 */
const HERO_VIDEO_Q = "q_90";
const HERO_VIDEO_ID = "axi-producto-hero_anqcob";
const HERO_VIDEO_ID_9X16 = "axi-producto-hero-9x16_tcfaou";

const videoVariant = (id: string, width: number) => ({
  mp4: `${CLOUDINARY_VIDEO}/vc_h264,${HERO_VIDEO_Q},w_${width}/${id}.mp4`,
  /** Segundo 8: ya se ve al fundador con su rótulo. */
  poster: `${CLOUDINARY_VIDEO}/so_8,${HERO_VIDEO_Q},f_jpg,w_${width}/${id}.jpg`,
});

export const HERO_VIDEO = {
  publicId: HERO_VIDEO_ID,
  desktop: videoVariant(HERO_VIDEO_ID, 1920),
  mobile: videoVariant(HERO_VIDEO_ID_9X16, 1080),
  ariaLabel: "Video: Cristian Velásquez, fundador y CTO de Axi Connect, explica el producto",
} as const;

export const VIDEO_SCENE = {
  eyebrow: "Desde adentro",
  strong: "Quien lo construye",
  thin: "te lo cuenta.",
  soundOn: "Escuchar el mensaje",
  soundOff: "Silenciar",
  play: "Reproducir el video",
} as const;

/* ─────────────── 4b · Así suena un negocio con Axi (el muro) ─────────────── */

/**
 * El muro de conversaciones del /productos original (productos-v1-archive),
 * recuperado a pedido de la dueña entre el video y el cierre. Adaptado por
 * honestidad (INVENTARIO §2.2):
 * - sin «En vivo» ni «con datos reales»: los negocios y los mensajes son de
 *   ejemplo, y lo dice;
 * - solo WhatsApp: Instagram y Messenger están integrados pero no probados con
 *   clientes, así que no se enseñan respondiendo;
 * - sin moda con tallas (el cierre con variantes sigue abierto): retail, comida
 *   y servicios con agenda, los tres nichos del estudio de mercado;
 * - cada respuesta usa algo que el agente hace de verdad: stock y precio del
 *   catálogo, foto, cupón de envío gratis, medios de pago, estado del pedido,
 *   agenda con recordatorio.
 */
export interface WallMessage {
  id: string;
  business: string;
  from: "customer" | "agent";
  text: string;
  /** La hora del mensaje, como en WhatsApp: el muro se lee como chats de verdad. */
  time: string;
}

export const WALL = {
  anchor: "conversaciones",
  eyebrow: "En tus canales",
  strong: "Así suena un negocio",
  thin: "con Axi.",
  lead: "Clientes de retail, comida y servicios escribiendo a cualquier hora, y el agente respondiendo en segundos con el catálogo, el stock y la agenda de cada negocio.",
  sample: "Negocios y conversaciones de ejemplo",
  label: "Conversaciones de ejemplo con el agente",
  channel: "WhatsApp",
  agent: "Agente · IA",
  customer: "Cliente",
  columns: [
    [
      { id: "w1", business: "Casa Nórdica", from: "customer", text: "¿La lámpara de mesa en roble la tienen?", time: "9:02" },
      { id: "w2", business: "Casa Nórdica", from: "agent", text: "Quedan 3, a $129.900. ¿Te armo el pedido?", time: "9:02" },
      { id: "w3", business: "Casa Nórdica", from: "customer", text: "Vi la cafetera del reel, ¿en cuánto sale?", time: "9:15" },
      { id: "w4", business: "Casa Nórdica", from: "agent", text: "Es la Moka de 6 tazas: $189.900, y hoy el envío va gratis. Te paso las fotos.", time: "9:16" },
      { id: "w5", business: "Dulce Alma", from: "customer", text: "Necesito una torta para 20 personas el sábado.", time: "9:31" },
    ],
    [
      { id: "w6", business: "Burger 33", from: "customer", text: "¿Llegan hasta Cedritos?", time: "8:47" },
      { id: "w7", business: "Burger 33", from: "agent", text: "Sí, en unos 35 minutos. ¿Qué te mando?", time: "8:47" },
      { id: "w8", business: "Burger 33", from: "customer", text: "¿El combo familiar trae gaseosa?", time: "8:52" },
      { id: "w9", business: "Burger 33", from: "agent", text: "Trae una de 1,5 L. ¿Lo confirmo para las 8:00?", time: "8:53" },
      { id: "w10", business: "Dulce Alma", from: "agent", text: "Para 20 tenemos la de tres leches o la de chocolate. ¿Cuál te cotizo?", time: "9:31" },
    ],
    [
      { id: "w11", business: "TechNova", from: "agent", text: "Tu pedido #1043 está en camino.", time: "10:04" },
      { id: "w12", business: "TechNova", from: "customer", text: "¿Puedo pagar con Nequi?", time: "10:11" },
      { id: "w13", business: "TechNova", from: "agent", text: "Sí: Nequi, Daviplata o transferencia. Te paso los datos.", time: "10:11" },
      { id: "w14", business: "BarberLab", from: "customer", text: "¿Tienen cita mañana a las 10:00?", time: "7:58" },
      { id: "w15", business: "BarberLab", from: "agent", text: "Las 10:00 están libres. Te agendo y te llega un recordatorio.", time: "7:58" },
    ],
    [
      { id: "w16", business: "Óptica Vértice", from: "customer", text: "¿Me recuerdan la cita del martes?", time: "18:20" },
      { id: "w17", business: "Óptica Vértice", from: "agent", text: "Claro: martes 3 a las 10:00 a. m. Te escribo un día antes y una hora antes.", time: "18:20" },
      { id: "w18", business: "BarberLab", from: "customer", text: "¿Cuánto vale el corte con barba?", time: "12:40" },
      { id: "w19", business: "BarberLab", from: "agent", text: "$35.000. ¿Te agendo hoy a las 6:00 p. m.?", time: "12:40" },
      { id: "w20", business: "Casa Nórdica", from: "agent", text: "Tu pedido #1088 está en camino.", time: "11:05" },
    ],
  ],
} as const;

/* ──────────────────────────────── 5 · Cierre ──────────────────────────────── */

/* ─────────────────────── 6 · Lo que cuesta (precio vivo) ─────────────────────── */

/**
 * El precio de Esencial NO vive aquí: sale del catálogo público
 * (`loadPublicCatalog`, el mismo de `/` y `/precios`) con el tramo de 1.000
 * conversaciones. Sin catálogo no se pinta ninguna cifra (D6 del plan en tinta).
 * El ancla del asesor es del estudio de mercado (MS §1.1), con su fuente al pie.
 */
export const PRICE = {
  strong: "Lo que cuesta.",
  thin: "Sin letra pequeña.",
  /** `cop`: el costo mensual de un asesor (MS §1.1: COP 2,82 M con prestaciones); de ahí sale el ahorro. */
  advisor: { label: "Un asesor de tiempo completo", value: "$ 2,8 M", cop: 2_820_000, note: "al mes, con prestaciones. Atiende en horario y de a una conversación." },
  /** La comparativa: se calcula con el precio vivo del catálogo; sin catálogo no se muestra. */
  compare: {
    savings: (pct: number) => `${pct} % menos`,
    line: "que un asesor de tiempo completo",
    advisorBar: "Asesor",
    axiBar: "Axi",
  },
  plan: {
    label: "Axi · plan Esencial",
    /** `volume` es la etiqueta del tramo del catálogo («1.000»). */
    note: (volume: string) => `al mes con ${volume} conversaciones. Atiende a toda hora y a todos a la vez.`,
    founder: "Precio fundador",
    /** Sin catálogo no hay cifra: se dice dónde verla, sin inventarla. */
    empty: "El precio depende de cuántas conversaciones atiendes al mes. Míralo por volumen en los planes.",
    cta: { label: "Ver todos los planes", href: "/precios" },
  },
  bullets: [
    "No cobramos por usuario: suma a todo tu equipo.",
    "7 días de prueba, sin tarjeta.",
    "Inbox, agente, catálogo, pedidos, CRM, agenda y analítica.",
    "La recuperación de ventas y las llamadas van en Crecimiento y Escala.",
  ],
  source: "Costo de un asesor según el estudio de mercado de Axi (salario y prestaciones en Colombia). Precios en pesos colombianos.",
  /** El tramo que se muestra: se busca por conversaciones, no por código. */
  conversations: 1000,
  planSlug: "esencial",
} as const;

/* ─────────────────────── 7 · Vende solo. Nunca sin ti. ─────────────────────── */

/** Los guardarraíles reales del agente (INVENTARIO §2.1, Agente IA e Inbox). */
export const CONTROL = {
  eyebrow: "Tú tienes el control",
  strong: "Vende solo.",
  thin: "Nunca sin ti.",
  lead: "Axi trabaja dentro de las reglas que pones. Lo que no sabe, no lo inventa: se lo pasa a tu equipo.",
  rules: [
    { id: "precios", title: "Nunca inventa precios.", text: "Cotiza con los de tu catálogo. Los totales los calcula el sistema, no la IA." },
    { id: "margen", title: "No regala tu margen.", text: "Solo aplica los descuentos y cupones que autorizaste. El 30 % que piden no existe." },
    { id: "pago", title: "El pago lo verifica tu equipo.", text: "Axi registra el comprobante en el pedido. Una persona confirma que el dinero llegó." },
    { id: "relevo", title: "Si no sabe, te la pasa.", text: "Cuando el cliente pide una persona o Axi falla varias veces seguidas, entra tu equipo. Si nadie la toma en 5 minutos, sube de prioridad." },
  ],
  rule: { kicker: "Así se lo dices a tu agente", quote: "Nunca inventes precios ni tiempos de entrega.", aside: "Si se acaba tu plan, Axi se pausa y tu bandeja sigue funcionando." },
} as const;

/* ──────────────────────────────── 8 · Cierre ──────────────────────────────── */

export const PRODUCTOS_CLOSE = {
  strong: "Siete días.",
  thin: "Tus clientes reales.",
  /** RouteLine monocroma: «Hoy» en coral (es la acción), el resto en tinta. Cada paso responde una duda de quien ya decidió. */
  route: [
    { day: "Hoy", label: "Conectas WhatsApp", detail: "En un botón, por el canal oficial de Meta. La verificación del número la hacemos contigo." },
    { day: "Día 2", label: "Subes tu catálogo", detail: "Fotos, precios y stock. Si vendes en Shopify, se sincroniza." },
    { day: "Día 3", label: "Vende de verdad", detail: "Con tus clientes reales. Tu equipo lo ve todo en la bandeja." },
    { day: "Día 7", label: "Decides", detail: "Sin tarjeta. Si sigues, eliges plan; si no, tus datos quedan intactos." },
  ],
  micro: "Sin tarjeta. Te acompañamos en la activación.",
  pricing: { label: "Ver precios", href: "/precios" },
  agent: "Escríbele a nuestro agente",
  more: { label: "Más preguntas", href: "/#preguntas" },
} as const;

/* ─────────────────────────────────── SEO ─────────────────────────────────── */

export const PRODUCTOS_SEO = {
  title: "Productos",
  description:
    "Juega a ser tu cliente y mira cómo vende Axi: reconoce fotos, responde en voz, cuida tu margen, toma el pedido y agenda. Bandeja, CRM, catálogo, llamadas, cobros y medición en pesos.",
} as const;
