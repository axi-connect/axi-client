/**
 * Contenido completo de la landing de conversión de Axi Connect.
 *
 * Fuente de verdad del copy: `axi/docs/business/landing-copy.md` (verbatim).
 * Referencia visual: plantilla "axi-connect-landing" (Downloads).
 *
 * REGLA: ninguna sección hardcodea texto ni cifras — todo sale de aquí, para
 * que reemplazar placeholders antes de publicar sea un cambio de un archivo.
 *
 * Pendientes de negocio (marcados TODO en cada dato):
 *   [CIFRA REAL]  — cifras de pilotos y de ejemplo del embudo.
 *   [A VALIDAR]   — permisos de marca, precios definitivos, canales IG/MSN.
 */

/* ────────────────────────────── WhatsApp ────────────────────────────── */

/** Número real del agente de Axi (confirmado en la plantilla v2). */
export const WHATSAPP_AGENT_NUMBER = "573224970950";

/** Deep link de WhatsApp con mensaje prellenado. */
export function buildWaLink(text: string): string {
  return `https://wa.me/${WHATSAPP_AGENT_NUMBER}?text=${encodeURIComponent(text)}`;
}

export const WA_MESSAGES = {
  hero: "Hola, quiero ver Axi Connect funcionando con mi negocio.",
  finalCta: "Hola, quiero ver Axi Connect funcionando con mi negocio.",
} as const;

/* ─────────────────────────────── Anclas ─────────────────────────────── */

export const LANDING_ANCHORS = {
  howItWorks: "como-funciona",
  metrics: "medicion",
  cases: "casos",
  pricing: "planes",
  faq: "preguntas",
  demo: "demo",
} as const;

/* ────────────────────────────── Mascotas ────────────────────────────── */

/**
 * Personajes de los agentes de la plataforma.
 * Viven en `public/images/mascots/`: el matcher del middleware solo exime
 * `images|fonts|assets` — cualquier otra carpeta de `public/` redirige a
 * login para visitantes sin sesión (middleware.ts).
 */
export const MASCOTS = {
  lumo: { src: "/images/mascots/lumo.png", alt: "Lumo, agente de Axi", width: 1080, height: 1080 },
  lumoCloseup: { src: "/images/mascots/lumo-closeup.png", alt: "Lumo, agente de Axi", width: 1080, height: 1080 },
  novaCloseup: { src: "/images/mascots/nova-closeup.png", alt: "Nova, agente de Axi", width: 1080, height: 1080 },
} as const;

/* ─────────────────────────────── §1 Hero ────────────────────────────── */

export const HERO = {
  // kicker: "Convierte cada conversación en una oportunidad de venta.",
  headline: "El futuro es conversacional.",
  // headlineGradient: "Y debería terminar en una venta.",
  subheadline:
    "Tus clientes ya te compran por WhatsApp e Instagram. Axi Connect pone ahí a tu mejor vendedor: responde en segundos, cotiza con tus precios reales, arma el pedido, comparte tus medios de pago y te muestra —en pesos— lo que produjo cada conversación. Y cuando hace falta una persona, tu equipo entra sin que el cliente note el cambio.",
  ctaPrimary: "Agenda tu demo",
  ctaSecondary: "Chatea con nuestro agente",
  microcopy: "La demo es con tu tipo de negocio, no con diapositivas. 30 minutos, sin compromiso.",
} as const;

/* ─────────────────────── Mockup de chat (hero y §4) ─────────────────── */

/**
 * CÓMO AÑADIR IMÁGENES REALES (`imageSrc` aquí y `photoSrc` en CASES):
 *   a) URL de Cloudinary (host ya permitido en next.config.ts):
 *      imageSrc: "https://res.cloudinary.com/<cloud>/image/upload/v.../foto.jpg"
 *   b) Archivo local: copiarlo a `public/images/landing/` y referenciarlo como
 *      "/images/landing/foto.jpg" — SIEMPRE bajo `images/` (el middleware
 *      redirige a login cualquier otra carpeta de public/).
 *   c) Otro dominio remoto: además de la URL, añadir su hostname a
 *      `images.remotePatterns` en next.config.ts.
 * Sin `imageSrc`/`photoSrc`, el mockup muestra el placeholder punteado.
 */
export type ChatMessage =
  | { id: string; from: "customer" | "agent"; kind: "text"; text: string }
  | {
      id: string;
      from: "agent";
      kind: "product";
      placeholder: string;
      caption: string;
      /** URL de la foto real del producto; null/undefined → placeholder. */
      imageSrc?: string | null;
    }
  | { id: string; from: "system"; kind: "system"; text: string };

/** Datos de la tarjeta "Venta pagada" que remata cada mockup de chat. */
export interface SaleCardData {
  title: string;
  amountValue: number;
  caption: string;
}

/**
 * Mockup del HERO — venta retail de tecnología (Apple Watch): cada mockup
 * de la página habla a un vertical distinto del ICP (aquí tecnología; en
 * §4, moda con Savage).
 */
export const HERO_CHAT = {
  businessName: "Tecnología, Medellín",
  status: "agente en línea · 8:47 p.m.",
  messages: [
    { id: "h1", from: "customer", kind: "text", text: "Hola, ¿tienen el Apple Watch SE de 44mm?" },
    { id: "h2", from: "agent", kind: "text", text: "¡Sí! El Apple Watch SE (2ª gen) de 44mm está disponible en Starlight. Te comparto la foto." },
    {
      id: "h3",
      from: "agent",
      kind: "product",
      placeholder: "foto real del producto (catálogo)",
      caption: "Apple Watch SE 44mm — $1.249.000",
      imageSrc: "https://res.cloudinary.com/dpfnxj52w/image/upload/v1785424235/apple_watch_hpyikz.jpg",
    },
    { id: "h4", from: "customer", kind: "text", text: "Me gusta. ¿Cómo lo pago?" },
    { id: "h5", from: "agent", kind: "text", text: "Listo, pedido #2087 por $1.249.000. Puedes pagar por Nequi, tarjeta o link de pago." },
  ] as ReadonlyArray<ChatMessage>,
  saleCard: {
    title: "Venta pagada",
    amountValue: 1_249_000,
    caption: "verificada por tu equipo · 8:53 p.m.",
  } as SaleCardData,
} as const;

/**
 * Mockup de §4 (Cómo funciona) — Savage vendiendo un hoodie: la historia
 * completa del timeline (pedido #1042, pago verificado por Laura).
 */
export const STORY_CHAT = {
  businessName: "Savage · Moda urbana",
  status: "agente en línea · 8:47 p.m.",
  messages: [
    { id: "s1", from: "customer", kind: "text", text: "Hola, ¿tienen el hodie oversize en talla M?" },
    { id: "s2", from: "agent", kind: "text", text: "Sí 🙌 El Hoodie Heavy en talla M está disponible. Te mando la foto." },
    {
      id: "s3",
      from: "agent",
      kind: "product",
      placeholder: "foto real del producto (catálogo)",
      caption: "Hoodie Heavy · M — $129.900",
      imageSrc: "https://res.cloudinary.com/dpfnxj52w/image/upload/v1785426993/hoodie_savage_ntmzum.jpg",
    },
    { id: "s4", from: "customer", kind: "text", text: "Perfecto, lo llevo. ¿Cómo pago?" },
    { id: "s5", from: "agent", kind: "text", text: "Listo, pedido #1042 por $129.900. Puedes pagar a Nequi 300 123 4567 o por link." },
  ] as ReadonlyArray<ChatMessage>,
  saleCard: {
    title: "Venta pagada",
    amountValue: 129_900,
    caption: "verificada por tu equipo · 8:53 p.m.",
  } as SaleCardData,
} as const;

/* ─────────────────────── §2 Barra de prueba social ──────────────────── */

/** Con al menos estos negocios, la banda de logos pasa a marquee automático. */
export const MARQUEE_MIN_ITEMS = 5;

export const SOCIAL_PROOF = {
  kicker: "Ya venden con Axi",
  businesses: [
    {
      name: "Joao's Burguer",
      detail: "comida rápida, Palmira",
      logoSrc: null as string | null | undefined,
      websiteUrl: "https://www.joaosburguer.com/",
    },
    {
      name: "Savage",
      detail: "moda urbana, Bogotá",
      logoSrc: "https://res.cloudinary.com/dpfnxj52w/image/upload/v1785430138/logo_savage_crop_lzvouy.png",
      websiteUrl: "https://www.savagecolombia.com/",
    },
    {
      name: "The Brothers Inc",
      detail: "estudio de grabación, Bogotá",
      logoSrc: null as string | null | undefined,
      websiteUrl: "https://thebrothersinc.co/",
    },
  ],
  closing: "Tres formas distintas de vender. Cero desarrollo a medida.",
} as const;

/* ───────────────────────────── §3 Problema ──────────────────────────── */

export const PROBLEM = {
  title: "Cada chat que se queda esperando es una venta que se va.",
  intro:
    "No es culpa tuya: la puerta cambió de lugar y la venta por chat creció más rápido que cualquier operación. Esto es lo que le pasa a casi todos los negocios que venden por WhatsApp:",
  pains: [
    {
      id: "after-hours",
      title: "Las ventas de las 9 de la noche no las atiende nadie.",
      body: "El cliente que escribe fuera de horario no espera hasta mañana: le compra al que sí respondió.",
    },
    {
      id: "single-phone",
      title: "Tu operación vive en el teléfono de alguien.",
      body: "Si esa persona se enferma, renuncia o simplemente no vio el mensaje, la venta no existió. Sin historial, sin trazabilidad, sin control.",
    },
    {
      id: "no-attribution",
      title: "Nadie sabe qué conversación terminó en venta.",
      body: "Respondes cientos de chats al mes y no puedes decir cuáles produjeron plata y cuáles se cayeron a mitad de camino. Invertir en atención, así, es un acto de fe.",
    },
    {
      id: "scary-bots",
      title: "Y los bots que probaste te dieron miedo — con razón.",
      body: "Inventan precios, prometen lo que no hay en stock, regalan descuentos que nadie autorizó. Un bot sin control no es ahorro: es riesgo.",
    },
  ],
  closing: "Axi Connect se construyó para atacar los cuatro. El último —el control— es el que define todo lo demás.",
} as const;

/* ──────────────────────── §4 Cómo funciona ──────────────────────────── */

export const HOW_IT_WORKS = {
  title: "Así se ve una venta con Axi. De “hola, ¿tienen…?” a pago verificado.",
  steps: [
    {
      n: "01",
      title: "Un cliente escribe a las 8:47 p.m.",
      body: "“Hola, ¿tienen el hoodie oversize en talla M?” Por WhatsApp, Instagram o Messenger — da igual: todos llegan al mismo lugar, y si ya te había escrito por otro canal, Axi sabe que es la misma persona.",
      // TODO [A VALIDAR]: puesta en producción de Instagram/Messenger (checklist landing-copy.md).
    },
    {
      n: "02",
      title: "Tu agente responde en segundos, con tu catálogo real.",
      body: "Encuentra el producto aunque el cliente escriba “hodie”, envía las fotos reales, responde con el precio de tu sistema. No improvisa: consulta.",
    },
    {
      n: "03",
      title: "Arma el pedido y comparte tus medios de pago.",
      body: "Cotiza con totales calculados por el sistema, confirma el pedido con número consecutivo, descuenta el inventario y le pasa al cliente tu Nequi, tu cuenta o tu link de pago. La venta completa ocurre dentro del chat — sin sacar al cliente a un carrito web.",
    },
    {
      n: "04",
      title: "Tu equipo entra exactamente cuando hace falta.",
      body: "El comprobante de pago siempre lo verifica una persona tuya — eso no se automatiza, por diseño. Y si el cliente pide un asesor o la conversación se complica, pasa a tu equipo con todo el contexto, sin que el cliente repita nada.",
    },
    {
      n: "05",
      title: "Tú ves lo que nadie más te muestra.",
      body: "Cuántas conversaciones hubo, cuántas cotizaron, cuántas pagaron, cuánta plata entró — y qué corregir primero para vender más el próximo mes.",
    },
  ],
  cta: "Ver esto con mi negocio",
  /** Tarjeta sticky "Tu agente, trabajando" (mascota Lumo close-up). */
  agentCard: {
    title: "Tu agente, trabajando",
    subtitle: "3 conversaciones a la vez · sin turnos",
  },
  /** Tarjeta de pedido del panel sticky. */
  orderCard: {
    title: "Pedido #1042",
    badge: "PAGO VERIFICADO",
    lines: [
      { label: "Hoodie Heavy · M", value: "$129.900" },
      { label: "Envío Bogotá", value: "$0" },
    ],
    total: { label: "Total", value: "$129.900" },
  },
  /** Línea de tiempo del panel sticky. */
  timeline: {
    title: "Línea de tiempo",
    events: [
      "Agente cotizó · 8:48 p.m.",
      "Pago reportado por el cliente · 8:51 p.m.",
      "Verificado por Laura (tu equipo) · 8:53 p.m.",
    ],
  },
} as const;

/* ──────────────────── §5 La objeción de la IA (bóveda) ──────────────── */

export const GUARDRAILS = {
  title: "La IA que no puede inventarle un precio a tu cliente.",
  intro: "No porque se lo pidamos amablemente en las instrucciones. Porque el dato no pasa por ella:",
  guarantees: [
    {
      id: "prices",
      title: "Los precios salen de tu catálogo.",
      body: "Cada cotización y cada total los calcula el sistema con tus datos reales. El modelo de IA nunca es la fuente de un precio.",
    },
    {
      id: "discounts",
      title: "Los descuentos son tu política.",
      body: "El agente comunica las condiciones que tú definiste. No puede regalar margen, ni “hacer una excepción”, ni negociar por su cuenta.",
    },
    {
      id: "payments",
      title: "Un pago solo está pagado cuando tu equipo lo verifica.",
      body: "El agente registra el comprobante que envía el cliente; darlo por recibido es siempre decisión de una persona.",
    },
    {
      id: "escalation",
      title: "Si no sabe, escala.",
      body: "Cuando el cliente pide un asesor o la conversación supera al agente, pasa a tu equipo con una despedida natural — el cliente nunca queda hablando con una pared.",
    },
  ],
  /** Tarjeta interactiva "pásale el cursor". */
  vault: {
    hint: "pásale el cursor",
    caption: "Cada conversación pasa por aquí: datos de tu negocio, no invenciones de un modelo.",
    vocabulary:
      "hola tienes disponible talla M cuanto vale precio $129.900 pedido #1042 nequi comprobante gracias envio bogota agendar cita hoodie oversize stock catalogo pago verificado ",
  },
  punchlineLead: "Compruébalo en la demo:",
  punchline: "pídele al agente un descuento que no autorizaste y mira qué hace.",
} as const;

/* ─────────────────────── §6 Medición (sección estrella) ─────────────── */

// TODO [CIFRA REAL]: cifras de ejemplo tomadas de la plantilla — reemplazar
// por el embudo real de un piloto antes de publicar (el producto ya las genera
// en /analytics).
export const METRICS = {
  titleMuted: "Las demás plataformas te dicen cuántos mensajes respondiste.",
  titleStrong: "Axi te dice cuánto vendiste, quién lo vendió y qué corregir mañana.",
  dashboard: {
    windowTitle: "app.axiconnect.co / analytics",
    funnelTitle: "Embudo de conversión · julio",
    funnelBadge: "DATOS DE EJEMPLO",
    funnel: [
      { label: "Conversaciones", value: 1_240, display: "1.240", widthPct: 100 },
      { label: "Cotizadas", value: 612, display: "612", widthPct: 72 },
      { label: "Pedidos creados", value: 318, display: "318", widthPct: 52 },
      { label: "Pagados", value: 223, display: "223", widthPct: 34 },
    ],
    summary: [
      { label: "Ventas pagadas", display: "$19.4M" },
      { label: "Tasa de cierre", display: "18%" },
      { label: "Sin humano", display: "71%" },
    ],
    issuesTitle: "Qué corregir primero",
    issuesSubtitle: "Frecuencia × severidad, del peor al menor",
    issues: [
      "Ofrece productos agotados en la categoría de bebidas",
      "No pide el dato de dirección antes de cerrar domicilios",
      "Escala a un humano cuando no hacía falta (12 casos)",
      "Cierres perdidos tras la primera objeción de precio",
    ],
  },
  statTiles: [
    {
      id: "paid-sales",
      title: "Ventas pagadas",
      body: "Cuánto dinero produjo el chat este mes. En pesos, no en “interacciones”.",
      value: 19.4,
      decimals: 1,
      prefix: "$",
      suffix: "M",
    },
    {
      id: "close-rate",
      title: "Tasa de cierre",
      body: "De cada 100 conversaciones, cuántas terminaron en venta pagada o cita cumplida.",
      value: 18,
      decimals: 0,
      prefix: "",
      suffix: "%",
    },
    {
      id: "no-human",
      title: "Resueltas sin humano",
      body: "El porcentaje que tu agente atendió solo. Es tu métrica de ahorro: equipo que no tuviste que contratar.",
      value: 71,
      decimals: 0,
      prefix: "",
      suffix: "%",
    },
    {
      id: "fix-first",
      title: "Qué corregir primero",
      body: "Axi revisa la calidad de las conversaciones y te entrega el ranking de problemas. Mejorar deja de ser adivinar.",
      value: 4,
      decimals: 0,
      prefix: "top ",
      suffix: "",
    },
  ],
  honestyLead: "Y medimos con honestidad:",
  honesty:
    "si un asesor tuyo cierra la venta después de que el agente la escaló, esa venta cuenta para tu negocio — pero el agente no se la atribuye. Te reportamos como quisieras que te reportaran.",
  cta: "Quiero ver mi embudo",
} as const;

/* ─────────────────────── §7 Tu equipo, en control ───────────────────── */

export const TEAM_CONTROL = {
  title: "Tu equipo no desaparece. Se vuelve más valioso.",
  intro:
    "El agente atiende la primera línea: las mismas preguntas cien veces al día, a cualquier hora. Tu gente atiende lo que de verdad necesita criterio humano — y tiene el control total:",
  capabilities: [
    {
      id: "take-over",
      title: "Entra cuando quiera.",
      body: "Cualquier asesor puede tomar una conversación en espera o intervenir una que el agente esté atendiendo. El historial es uno solo: el cliente nunca repite su cuento.",
    },
    {
      id: "hand-back",
      title: "Devuelve el control con instrucciones.",
      body: "Al regresarle la conversación al agente, tu asesor puede dejarle una nota — y el agente la lee y la aplica. Es tu forma de enseñarle en caliente.",
    },
    {
      id: "sla",
      title: "Nada se queda esperando.",
      body: "Si una conversación escalada no se atiende en 5 minutos, sube de prioridad y notifica al equipo. Los tiempos de espera dejan de ser invisibles.",
    },
  ],
  closingLead: "Y si tu negocio supera el plan del mes, se pausa el agente — ",
  closingStrong: "nunca tu operación",
  closingTail:
    ". Tu equipo sigue atendiendo desde el mismo lugar, con todo el historial. Con Axi, lo peor que puede pasar es que vuelvas a atender como hoy.",
  /** Mockup del inbox del equipo. */
  inbox: {
    title: "Inbox del equipo",
    badge: "3 EN COLA",
    queue: [
      { name: "Andrés M.", tag: "SLA 4:12", tagKind: "sla" as const, preview: "Pidió hablar con un asesor", active: true },
      { name: "Carolina R.", tag: "IA", tagKind: "ai" as const, preview: "Cotizando 2 productos…", active: false },
      { name: "Julián T.", tag: "IA", tagKind: "ai" as const, preview: "Pago reportado · por verificar", active: false },
      { name: "Marcela P.", tag: "Laura", tagKind: "human" as const, preview: "Cambio de talla", active: false },
    ],
    thread: {
      customerMessage: "¿Me pueden hacer un descuento si llevo dos?",
      systemPill: "Laura tomó la conversación",
      agentReply: "Hola Andrés, soy Laura. Te confirmo el combo por dos unidades 👇",
      noteLead: "Nota para el agente: ",
      note: "“El combo x2 aplica solo esta semana.”",
      inputPlaceholder: "Escribe un mensaje…",
      returnAction: "Devolver a la IA",
    },
  },
} as const;

/* ─────────────────────────────── §8 Casos ───────────────────────────── */

// TODO [CIFRA REAL] + [A VALIDAR]: cifras y permiso de publicación de los
// tres pilotos. Mientras `pending` sea true, la tarjeta muestra el badge
// "CIFRA PENDIENTE" (como la plantilla). `photoSrc` sigue la guía de
// imágenes de arriba (Cloudinary o /images/landing/...); sin él se muestra
// el placeholder punteado.
export const CASES = {
  title: "Tres negocios que ya no adivinan cuánto les vende el chat.",
  cases: [
    {
      id: "joaos",
      name: "Joao's Burguer",
      sector: "Comida rápida — Palmira, Valle",
      body: "Pedidos a domicilio por WhatsApp, pagos por Nequi y efectivo. El agente toma el pedido completo, comparte los medios de pago y el equipo solo verifica y despacha.",
      photoPlaceholder: "foto del negocio · Joao's Burguer",
      photoSrc: "https://res.cloudinary.com/dpfnxj52w/image/upload/v1785425234/joaos_burguer_site_evwjvf.png",
      stat: { value: 74, decimals: 0, prefix: "", suffix: "%", caption: "de los pedidos se toman sin intervención humana", pending: true },
    },
    {
      id: "savage",
      name: "Savage",
      sector: "Moda urbana — Bogotá",
      body: "129 productos con tallas y fotos por variante, envíos a todo el país. El agente encuentra la prenda aunque se la pidan con errores de escritura, envía las fotos reales y cierra el pedido con el stock del sistema.",
      photoPlaceholder: "foto del negocio · Savage",
      photoSrc: "https://res.cloudinary.com/dpfnxj52w/image/upload/v1785430467/savage_site_svb3ss.png",
      stat: { value: 18, decimals: 0, prefix: "", suffix: "%", caption: "de tasa de cierre sobre las conversaciones del mes", pending: true },
    },
    {
      id: "tbi",
      name: "The Brothers Inc",
      sector: "Estudio de grabación — Bogotá",
      body: "Aquí lo que se vende es tiempo: sesiones de grabación. El agente consulta la disponibilidad real, agenda la sesión y el sistema envía recordatorios automáticos 24 horas y 1 hora antes.",
      photoPlaceholder: "foto del negocio · TBI Studio",
      photoSrc: "https://res.cloudinary.com/dvtz1qx7g/image/upload/v1773613307/DSC05581.jpg_smbyqx.jpg",
      stat: { value: -31, decimals: 0, prefix: "", suffix: "%", caption: "de citas incumplidas desde los recordatorios", pending: true },
    },
  ],
  pendingBadge: "CIFRA PENDIENTE",
  cta: "Mi negocio es distinto — muéstrenme",
} as const;

/* ─────────────────────────────── §9 Planes ──────────────────────────── */

// TODO [A VALIDAR]: precios ancla definitivos y política de excedente
// (racional en landing-copy.md §9). Los valores actuales son la propuesta.
export const PRICING = {
  title: "Pagas por lo que tu negocio conversa y vende. No por funciones.",
  intro:
    "Todos los planes incluyen lo esencial completo: tu agente vendedor, el catálogo, los pedidos, el inbox de tu equipo y la medición de ventas. Lo que cambia es el volumen que tu negocio maneja y los canales que conecta.",
  plans: [
    {
      id: "inicio",
      name: "Inicio",
      tagline: "Para el negocio que empieza a ordenar su venta por chat.",
      pricePrefix: "Desde",
      price: "$250.000",
      priceUnit: "COP/mes",
      featured: false,
      bullets: [
        "Hasta 300 conversaciones/mes",
        "Conecta tu número de WhatsApp actual en minutos (escaneando un código, como WhatsApp Web)",
        "1 agente vendedor con tu catálogo y tus pedidos",
        "Inbox para tu equipo y medición esencial de ventas",
      ],
      cta: "Agenda tu demo",
    },
    {
      id: "crecimiento",
      name: "Crecimiento",
      badge: "El más elegido",
      tagline: "Para el negocio que ya no da abasto.",
      pricePrefix: "Desde",
      price: "$850.000",
      priceUnit: "COP/mes",
      featured: true,
      bullets: [
        "Hasta 3.000 conversaciones/mes",
        // TODO [A VALIDAR]: estado de producción de Instagram/Messenger.
        "WhatsApp oficial (API de Meta) + Instagram + Messenger",
        "Varios agentes por canal y agenda de citas con recordatorios automáticos",
        "Medición completa: embudo en pesos, calidad de cada conversación y ranking de qué corregir",
        "Roles y permisos para todo tu equipo",
      ],
      cta: "Agenda tu demo",
    },
    {
      id: "enterprise",
      name: "Enterprise",
      tagline: "Para operaciones de alto volumen o con exigencias de aislamiento de datos.",
      pricePrefix: "",
      price: "Precio a la medida",
      priceUnit: "",
      featured: false,
      bullets: [
        "Volumen de conversaciones a la medida",
        "Base de datos dedicada solo para tu empresa",
        "Límites, acompañamiento y soporte prioritario",
      ],
      cta: "Hablemos",
    },
  ],
  microcopy:
    "¿No sabes cuántas conversaciones maneja tu negocio? Normal: casi nadie lo sabe antes de medirlo. En la demo lo estimamos contigo y te decimos exactamente qué plan te corresponde.",
} as const;

/* ─────────────────────────────── §10 FAQ ────────────────────────────── */

export const FAQ = {
  title: "Preguntas frecuentes",
  items: [
    {
      q: "¿Necesito la API oficial de WhatsApp para empezar?",
      a: "No. Puedes conectar tu número actual en minutos, escaneando un código — como WhatsApp Web. Cuando tu volumen lo justifique, te ayudamos a migrar al canal oficial de Meta sin perder nada.",
    },
    {
      q: "¿Cuánto tarda quedar funcionando?",
      a: "No hay desarrollo a medida: tu agente se configura, no se programa. Cargas tu catálogo, defines cómo vende tu negocio y ajustas su personalidad desde el panel. La demo te muestra ese proceso con un negocio como el tuyo.",
    },
    {
      q: "¿La IA va a reemplazar a mi equipo?",
      a: "No — le quita lo repetitivo. El agente atiende la primera línea; tu equipo interviene cuando hace falta criterio, verifica cada pago y puede tomar cualquier conversación en cualquier momento. La medición te dice cuánto volumen absorbió el agente: ese es equipo que no tuviste que contratar, no equipo despedido.",
    },
    {
      q: "¿Qué pasa si la IA no sabe responder?",
      a: "Escala a tu equipo, con todo el contexto y una despedida natural. También escala si el cliente pide un asesor o si falla dos veces seguidas. El cliente nunca queda atrapado con un bot.",
    },
    {
      q: "¿Puede el agente inventar precios o dar descuentos?",
      a: "No puede. Los precios los calcula el sistema desde tu catálogo, y los descuentos son política tuya que el agente solo comunica. Es la parte de la demo que más disfrutamos mostrar.",
    },
    {
      q: "¿Qué pasa si me paso de las conversaciones de mi plan?",
      a: "Se pausa el agente de IA, nunca tu operación: tu equipo sigue atendiendo todas las conversaciones desde el mismo inbox. Te avisamos al 80 % y al 100 % del consumo para que nada te sorprenda.",
    },
    {
      q: "¿Mis datos están seguros? ¿Quién más los ve?",
      a: "Nadie. Los datos de tu empresa están aislados de cualquier otra por construcción del sistema — no por buenas intenciones. Y en el plan Enterprise, tu empresa opera sobre una base de datos exclusiva.",
    },
    {
      q: "¿Sirve si vendo servicios y no productos?",
      a: "Sí. El agente consulta tu disponibilidad real, agenda citas y el sistema envía recordatorios automáticos. Uno de nuestros clientes vende sesiones de estudio de grabación: puro tiempo, cero productos.",
    },
  ],
} as const;

/* ──────────────────────── §10b Terminal (plantilla v2) ──────────────── */

export const TERMINAL = {
  title: "El futuro es conversacional.",
  intro: "Tu negocio ya vive en el chat. Esto es lo que pasa ahí dentro, paso a paso, cada vez que alguien te escribe.",
  windowTitle: "axi connect — conversación en vivo",
  prompt: "axi ~ $ ",
  script: [
    {
      cmd: "axi atender --canal whatsapp --hora 21:47",
      results: ["✔ Contacto reconocido: Andrés M. (ya escribió por Instagram)", "✔ Conversación abierta · agente en turno"],
    },
    {
      cmd: 'axi cotizar "hodie oversize talla M"',
      results: ["✔ Producto encontrado en tu catálogo: Hoodie Heavy · M", "✔ Precio calculado por el servidor: $129.900"],
    },
    {
      cmd: "axi cerrar --pedido",
      results: ["✔ Pedido #1042 creado · inventario descontado", "✔ Medios de pago compartidos: Nequi, link", "✔ Pago verificado por Laura (tu equipo)"],
    },
    {
      cmd: "axi medir --mes julio",
      results: ["1.240 conversaciones · 223 pagadas · 18 % de cierre", "$19.4M en ventas atribuidas al chat"],
    },
    {
      cmd: "El futuro es conversacional. El futuro es axi connect.",
      results: [],
    },
  ],
} as const;

/* ─────────────────────────── §11 CTA final ──────────────────────────── */

export const FINAL_CTA = {
  title: "Míralo funcionando con un negocio como el tuyo.",
  subtitle:
    "30 minutos. Te mostramos una venta completa —del “hola” al pago verificado— y el embudo que te dice cuánto produjo. Sin compromiso y sin diapositivas.",
  form: {
    title: "Agenda tu demo",
    namePlaceholder: "¿Cómo te llamas?",
    businessPlaceholder: "¿Cómo se llama tu negocio?",
    whatsappPlaceholder: "Tu WhatsApp",
    volumeLabel: "¿Cuántas conversaciones maneja tu negocio al mes, aproximadamente?",
    submit: "Agendar mi demo",
    microcopy: "Te escribimos por WhatsApp el mismo día para coordinar la hora.",
    successTitle: "¡Listo! Abrimos WhatsApp con tus datos.",
    successBody: "Envíanos ese mensaje y te escribimos el mismo día para coordinar la hora de tu demo.",
  },
  whatsappCard: {
    title: "¿Prefieres verlo ahora mismo?",
    body: "Nuestro propio agente atiende este WhatsApp. Pregúntale lo que quieras — incluido el precio.",
    cta: "Chatear con el agente de Axi",
    microcopy: "Sí: la demo es el producto. El agente que te responde está hecho con Axi.",
  },
} as const;

/* ─────────────────────── Datos de contacto (/contacto) ──────────────────── */

/**
 * Datos de la empresa que se muestran en `/contacto`.
 *
 * PENDIENTE DE DATOS: el correo comercial. Cada entrada se renderiza solo si
 * tiene `value`, así que la tarjeta no muestra huecos mientras falte.
 */
export const CONTACT = {
  title: "Axi Connect",
  details: [
    { label: "WhatsApp", value: "+57 322 497 0950", href: `https://wa.me/${WHATSAPP_AGENT_NUMBER}` },
    { label: "Ubicación", value: "Colombia", href: undefined },
  ].filter((detail) => detail.value.length > 0) as readonly {
    label: string;
    value: string;
    href?: string;
  }[],
} as const;

/** Mensaje de WhatsApp que construye el submit del formulario de demo. */
export function buildDemoLeadWaText(values: {
  name: string;
  businessName: string;
  whatsapp: string;
  volumeLabel: string;
}): string {
  return (
    "Hola, quiero agendar una demo de Axi Connect.\n\n" +
    `Nombre: ${values.name || "—"}\n` +
    `Negocio: ${values.businessName || "—"}\n` +
    `WhatsApp: ${values.whatsapp || "—"}\n` +
    `Conversaciones al mes: ${values.volumeLabel}`
  );
}
