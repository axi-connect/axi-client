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
  pieces: "piezas",
  video: "video",
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
  lead: "Juega a ser tu cliente. Así responde Axi.",
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
  /** El canal de la jugada en la consola, en versalitas (lienzo v10). */
  channel: string;
  /** Lo que escribe el visitante (el cliente). */
  customer: readonly GameMessage[];
  /** Lo que responde Axi (o el equipo), tras el «escribiendo…». */
  reply: readonly GameMessage[];
}

const PRODUCT_IMAGE = "/images/landing/gafas-aviador-ambar.jpg";
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
    channel: "Imagen",
    customer: [
      { kind: "photo", from: "customer", imageSrc: PRODUCT_IMAGE, imageAlt: "Captura de un reel con unas gafas de lente ámbar", caption: "Captura de un reel" },
      { kind: "text", from: "customer", text: "¿Tienen estas?" },
    ],
    reply: [
      { kind: "text", from: "agent", text: "Sí, son las Aviador Ámbar. Nos quedan 4." },
      { kind: "card", from: "agent", kicker: "De tu catálogo", title: "Aviador Ámbar", meta: "$189.000 · quedan 4", imageSrc: PRODUCT_IMAGE, imageAlt: "Gafas Aviador Ámbar" },
    ],
  },
  {
    id: "voz",
    label: "Háblale",
    channel: "Nota de voz",
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
    channel: "Negocia",
    customer: [{ kind: "text", from: "customer", text: "¿Me las dejas un 30 % más baratas?" }],
    reply: [{ kind: "text", from: "agent", text: "Eso no lo tengo autorizado. Con el cupón PRIMERAVEZ te quedan en $170.100." }],
  },
  {
    id: "compra",
    label: "Cómpralas",
    channel: "Pedido",
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
    channel: "Agenda",
    customer: [{ kind: "text", from: "customer", text: "¿Me hacen el examen visual?" }],
    reply: [{ kind: "text", from: "agent", text: "Claro. El martes 3 tengo 10:00 a. m. o 4:00 p. m. Te lo recuerdo antes." }],
  },
  {
    id: "persona",
    label: "Pide una persona",
    channel: "Humano",
    customer: [{ kind: "text", from: "customer", text: "Prefiero hablar con una persona" }],
    reply: [
      { kind: "event", text: "Laura entró a la conversación", tone: "amber" },
      { kind: "text", from: "human", author: "Laura", text: "Hola, soy Laura. Te ayudo con gusto." },
    ],
  },
];

export const GAME = {
  business: "Óptica Vértice",
  /** El avatar del chat: iniciales en tinta, como el teléfono de la home. */
  initials: "ÓV",
  day: "Hoy",
  read: "leído",
  /** Decorativo (`alt` vacío): el nombre va escrito al lado. */
  avatar: { src: "/images/landing/optica-vertice-logo.png", alt: "" },
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
  abilitiesTitle: "Habilidades",
  movesTitle: "Tú eres el cliente",
  /** La consola de jugadas (lienzo v10, «El futuro es conversacional»). */
  console: {
    moves: (n: number) => `${String(n).padStart(2, "0")} jugadas`,
    motto: "Axi · El futuro es conversacional",
    sending: "Transmitiendo…",
    done: "Completada",
  },
  locked: { name: "Por descubrir", line: "Haz una jugada" },
  /** La habilidad del CRM se descubre sola tras estas jugadas. */
  crmAfterMoves: 3,
  done: { strong: "7 de 7.", thin: "Ahora, con tu catálogo.", replay: "Jugar otra vez" },
  playVoice: "Escuchar nota de voz",
  pauseVoice: "Pausar nota de voz",
  chatLabel: "Chat de ejemplo con Óptica Vértice",
  /** Para lectores de pantalla y buscadores: el juego tiene guion. */
  note: "Demostración con guion: las respuestas son de ejemplo y los audios son reales.",
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
  { id: "inbox", tab: "Bandeja", tone: "violet", strong: "Todo tu chat.", thin: "Una sola bandeja.", sample: true },
  { id: "configura", tab: "Agente", tone: "violet", strong: "Lo configuras.", thin: "No lo programas.", sample: false },
  { id: "catalogo", tab: "Catálogo", tone: "coral", strong: "Tu catálogo,", thin: "entendido.", sample: true },
  { id: "crm", tab: "CRM", tone: "coral", strong: "Cada conversación,", thin: "una oportunidad.", sample: true },
  { id: "llamadas", tab: "Llamadas", tone: "violet", strong: "Cuando hay que llamar,", thin: "llama.", sample: true },
  { id: "cobros", tab: "Cobros", tone: "amber", strong: "Te deben.", thin: "Axi te dice a quién primero.", sample: true },
  { id: "medicion", tab: "Medición", tone: "amber", strong: "Ventas en pesos.", thin: "No mensajes.", sample: true },
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
    products: readonly { name: string; price: string; stock: string; on?: boolean; out?: boolean }[];
    name: string;
    price: string;
    category: string;
    imageSrc: string;
    imageAlt: string;
    variantsLabel: string;
    columns: readonly [string, string, string];
    variants: readonly { name: string; sku: string; stock: string; out: boolean }[];
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
  llamadas: {
    title: string;
    tabs: readonly string[];
    calls: readonly { who: string; kind: string; length: string; result: string; tone: ScreenTone; on?: boolean }[];
    who: string;
    result: string;
    stages: readonly { label: string; reached: boolean }[];
    notesLabel: string;
    notes: readonly { label: string; text: string }[];
    summary: string;
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
      { name: "Aviador Ámbar", price: "$189.000", stock: "11 en stock", on: true },
      { name: "Clubmaster Carey", price: "$215.000", stock: "6 en stock" },
      { name: "Redonda Titanio", price: "$248.000", stock: "3 en stock" },
      { name: "Wayfarer Negra", price: "$169.000", stock: "Agotado", out: true },
    ],
    name: "Aviador Ámbar",
    price: "$189.000",
    category: "Monturas de sol",
    imageSrc: PRODUCT_IMAGE,
    imageAlt: "Gafas Aviador Ámbar",
    variantsLabel: "Variantes y stock (3)",
    columns: ["Variante", "SKU", "Stock"],
    variants: [
      { name: "Negro / Ámbar", sku: "AV-NA-01", stock: "4 · disponible", out: false },
      { name: "Dorado / Verde", sku: "AV-DV-02", stock: "7 · disponible", out: false },
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
    title: "Llamadas",
    tabs: ["Monitoreo", "Historial", "Marcos", "Configuración"],
    calls: [
      { who: "Andrés M.", kind: "Saliente · Venta", length: "2:14", result: "Objetivo cumplido", tone: "ok", on: true },
      { who: "Lucía C.", kind: "Saliente · Recordatorio de cita", length: "0:58", result: "Objetivo cumplido", tone: "ok" },
      { who: "Pedro N.", kind: "Saliente · Cobranza", length: "1:31", result: "Pidió que lo llamen", tone: "violet" },
      { who: "Sara L.", kind: "Saliente · Seguimiento", length: "0:12", result: "Sin respuesta", tone: "muted" },
    ],
    who: "Axi llamó a Andrés M. · 2:14",
    result: "Objetivo cumplido",
    stages: [
      { label: "Apertura", reached: true },
      { label: "Motivo", reached: true },
      { label: "Propuesta", reached: true },
      { label: "Cierre", reached: true },
    ],
    notesLabel: "Lo que Axi anota",
    notes: [
      { label: "Motivo", text: "Retomar la cotización" },
      { label: "Busca", text: "Gafas negras, lente naranja" },
      { label: "Producto", text: "Aviador Ámbar" },
      { label: "Siguiente paso", text: "Enviarle el pedido por WhatsApp" },
    ],
    summary: "Resumen escrito por Axi al colgar",
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

/* ──────────────────────────────── 5 · Cierre ──────────────────────────────── */

export const PRODUCTOS_CLOSE = {
  strong: "Siete días.",
  thin: "Tus clientes reales.",
  /** RouteLine: recorrido y lo que falta. */
  route: [
    { day: "Día 1", label: "Conectas WhatsApp", tone: "coral" },
    { day: "Día 2", label: "Subes tu catálogo", tone: "amber" },
    { day: "Día 3", label: "Vende de verdad", tone: null },
    { day: "Día 7", label: "Decides", tone: "violet" },
  ] as readonly { day: string; label: string; tone: GameTone | null }[],
  pricing: { label: "Ver precios", href: "/precios" },
  agent: "Habla con nuestro agente",
} as const;

/* ─────────────────────────────────── SEO ─────────────────────────────────── */

export const PRODUCTOS_SEO = {
  title: "Productos",
  description:
    "Juega a ser tu cliente y mira cómo vende Axi: reconoce fotos, responde en voz, cuida tu margen, toma el pedido y agenda. Bandeja, CRM, catálogo, llamadas, cobros y medición en pesos.",
} as const;
