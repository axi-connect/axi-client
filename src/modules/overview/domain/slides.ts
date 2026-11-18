/**
 * Guion de `/overview`, la presentación comercial pública (docs/plans/overview_deck_plan.md §5).
 *
 * Es el pitch estándar: todos los vendedores lo cuentan igual. Cada lámina dice UNA idea con el estilo de subtítulos
 * de Axi —una entrada chica y una clave grande con la palabra fuerte en coral— y lleva la nota del vendedor, que solo
 * se ve en el modo guion. El orden es el del método comercial: dolor → promesa → prueba → control → cómo empezamos →
 * cierre (docs/business/metodo-comercial/06-demo-guion-base.md).
 *
 * Datos puros: sin React ni URLs. Los clips de cada lámina están en `media.ts`.
 */
import type { CaseTag } from "./diagnosis";
import type { ClipId } from "./media";

/** Un tramo de la clave; `acento` lo pinta en coral (una o dos palabras por idea). */
export type KeySegment = { readonly text: string; readonly accent?: boolean };

export type SlideKind =
  | "cover"
  | "clip"
  | "diagnosis"
  | "problem"
  | "pillars"
  | "integrations"
  | "route"
  | "plans"
  | "closing";

export type Slide = {
  /** Ancla de la URL (`/overview#integraciones`): ASCII, estable, se comparte. */
  readonly id: string;
  /** Nombre corto del índice y del guion. */
  readonly title: string;
  readonly kind: SlideKind;
  readonly lead: string;
  readonly key: readonly KeySegment[];
  /** Una línea de apoyo como máximo. */
  readonly support?: string;
  /** Lo que dice el vendedor. Solo en el modo guion. */
  readonly note: string;
  /** Casos del diagnóstico a los que responde la lámina. */
  readonly tags?: readonly CaseTag[];
  readonly clip?: ClipId;
  /** Fila de logos de canales (DESIGN: logos de terceros solo en canales e integraciones). */
  readonly channelLogos?: boolean;
};

export const SLIDES: readonly Slide[] = [
  {
    id: "portada",
    title: "Portada",
    kind: "cover",
    lead: "vende en cada",
    key: [{ text: "conversación.", accent: true }],
    note: "Preséntate en una frase y di el objetivo: «en 15 minutos te muestro cómo Axi vende por ti en WhatsApp, y al final vemos si tiene sentido dejarlo funcionando».",
  },
  {
    id: "gancho",
    title: "Anoche te escribieron",
    kind: "clip",
    clip: "gancho",
    tags: ["tarde"],
    lead: "anoche te escribieron.",
    key: [{ text: "¿quién " }, { text: "respondió?", accent: true }],
    note: "Pregunta y calla: «¿qué pasa hoy con un mensaje que te llega a las 9 de la noche?». Deja que cuente. Lo que diga va en el diagnóstico.",
  },
  {
    id: "diagnostico",
    title: "¿Qué te está pasando?",
    kind: "diagnosis",
    lead: "¿qué te está",
    key: [{ text: "pasando?", accent: true }],
    note: "Marca con el cliente lo que diga, con sus palabras. Las láminas que responden a cada punto quedan señaladas en la ruta de abajo y en el índice: ve directo a ellas.",
  },
  {
    id: "problema",
    title: "El problema",
    kind: "problem",
    lead: "el canal donde entra el dinero",
    key: [{ text: "es el peor " }, { text: "atendido.", accent: true }],
    note: "Repite sus palabras, no las nuestras. Si marcó «respondo tarde», empieza por «tarde».",
  },
  {
    id: "axi",
    title: "Qué es Axi",
    kind: "pillars",
    lead: "axi es tu",
    key: [{ text: "mejor " }, { text: "vendedor.", accent: true }],
    note: "Una frase, sin tecnología: «Axi atiende tus canales como tu mejor vendedor: responde en segundos, cotiza con tus precios, cobra y te lleva a tu meta del mes».",
  },
  {
    id: "responde",
    title: "Responde en segundos",
    kind: "clip",
    clip: "responde",
    tags: ["tarde"],
    lead: "responde",
    key: [{ text: "en segundos,", accent: true }],
    support: "a cualquier hora, como una persona de tu equipo.",
    note: "No expliques: déjalo mirar. Si estás en vivo, pídele que le escriba al número de demo desde su celular.",
  },
  {
    id: "vende",
    title: "Cotiza con tus precios",
    kind: "clip",
    clip: "vende",
    tags: ["tarde"],
    lead: "cotiza con",
    key: [{ text: "tus precios.", accent: true }],
    support: "Del primer mensaje al pedido, dentro del chat.",
    note: "«Así cierra una venta sin ti: talla, dirección, total y pedido #1042». El pago queda por confirmar: lo confirma una persona o Shopify.",
  },
  {
    id: "control",
    title: "No inventa nada",
    kind: "clip",
    clip: "control",
    tags: ["control"],
    lead: "no inventa",
    key: [{ text: "precios " }, { text: "ni promesas.", accent: true }],
    note: "La prueba: «pídele un descuento del 30 %». No lo da, porque los precios los calcula el sistema y no la IA. Pregunta: «¿qué te preocupa de dejar una IA hablando con tus clientes?».",
  },
  {
    id: "equipo",
    title: "Tu equipo al mando",
    kind: "clip",
    clip: "equipo",
    tags: ["control"],
    lead: "tú tienes",
    key: [{ text: "el " }, { text: "control.", accent: true }],
    support: "Intervienes cuando quieras. Axi espera y retoma.",
    note: "Un toque en «Intervenir» y la conversación es tuya; Axi se pausa hasta que se la devuelvas. Pregunta: «¿quién de tu equipo usaría esto?».",
  },
  {
    id: "un-lugar",
    title: "Una sola bandeja",
    kind: "clip",
    clip: "un-lugar",
    tags: ["disperso"],
    channelLogos: true,
    lead: "redes, whatsapp y tienda,",
    key: [{ text: "una sola " }, { text: "bandeja.", accent: true }],
    note: "Si vende por varios canales: «hoy cada pedido está en un lado; aquí todo llega a la misma bandeja y a la misma ficha del cliente».",
  },
  {
    id: "clientes",
    title: "Adiós al Excel",
    kind: "clip",
    clip: "clientes",
    tags: ["excel"],
    lead: "adiós al",
    key: [{ text: "excel.", accent: true }],
    support: "Cada cliente con su ficha, su historia y su etapa. Sin escribir nada.",
    note: "Si lleva los clientes a mano: «cada persona que escribe queda con su ficha, su historia y su etapa, sin que nadie la escriba».",
  },
  {
    id: "seguimiento",
    title: "Seguimiento solo",
    kind: "clip",
    clip: "seguimiento",
    tags: ["seguimiento"],
    lead: "el seguimiento",
    key: [{ text: "se hace " }, { text: "solo.", accent: true }],
    note: "«¿Cuántas cotizaciones se te quedaron frías este mes?». Axi las retoma solo, en horario legal y con un contacto por día.",
  },
  {
    id: "integraciones",
    title: "Se conecta con lo que usas",
    kind: "integrations",
    tags: ["sistemas", "disperso"],
    lead: "se conecta con",
    key: [{ text: "lo que " }, { text: "ya usas.", accent: true }],
    note: "Pregunta: «¿qué sistema usas hoy para inventario, facturación y pagos?». Shopify, SIESA y pagos se conectan; si es otro, lo conectamos a la medida.",
  },
  {
    id: "llamadas",
    title: "También contesta el teléfono",
    kind: "clip",
    clip: "llamadas",
    tags: ["tarde"],
    lead: "también contesta",
    key: [{ text: "el " }, { text: "teléfono.", accent: true }],
    note: "La llamada de Laura: objetivo cumplido y el resumen escrito solo. La llamada avisa que la atiende un asistente virtual.",
  },
  {
    id: "recupera",
    title: "Recupera ventas",
    kind: "clip",
    clip: "recupera",
    tags: ["seguimiento"],
    lead: "recupera las ventas",
    key: [{ text: "que se " }, { text: "iban.", accent: true }],
    note: "Carritos sin confirmar y conversaciones sin respuesta: mensajes que salen solos cuando una venta se enfría. Tú decides cuándo se encienden.",
  },
  {
    id: "busca",
    title: "Busca clientes por ti",
    kind: "clip",
    clip: "busca",
    tags: ["clientes"],
    lead: "busca clientes",
    key: [{ text: "por ti.", accent: true }],
    note: "El piloto encuentra negocios que encajan contigo y les escribe con tu aprobación, dentro del presupuesto que pongas.",
  },
  {
    id: "meta",
    title: "La meta del mes",
    kind: "clip",
    clip: "meta",
    tags: ["meta"],
    lead: "sabes si",
    key: [{ text: "llegas.", accent: true }],
    support: "Tu meta del mes, el camino que falta y lo que toca hoy.",
    note: "Cierra la prueba con el progreso: «pones tu meta y cada día ves por dónde vas, cuánto falta y qué hacer hoy para llegar». Señala las indicaciones de hoy.",
  },
  {
    id: "empezamos",
    title: "Cómo empezamos",
    kind: "route",
    lead: "lo dejamos",
    key: [{ text: "funcionando.", accent: true }],
    note: "Literal: «El día de la sesión lo dejamos atendiendo en tu WhatsApp y te entrego tu acceso. Desde ese día tienes siete días gratis. El día 5 revisamos juntos qué vendió».",
  },
  {
    id: "planes",
    title: "Planes",
    kind: "plans",
    lead: "un plan para",
    key: [{ text: "cada " }, { text: "etapa.", accent: true }],
    note: "Ancla siempre en Crecimiento. Si no necesita llamadas ni captación, baja a Esencial; si tiene varias líneas o volumen alto, Escala.",
  },
  {
    id: "cierre",
    title: "¿Qué día empezamos?",
    kind: "closing",
    lead: "¿qué día lo dejamos",
    key: [{ text: "funcionando?", accent: true }],
    note: "La pregunta no es «¿lo compras?». Es: «¿jueves o viernes?» Dos opciones, nunca «¿cuándo puedes?».",
  },
];

/** Las tres fracturas de la lámina del problema (knowledge-base §2, en palabras del cliente). */
export const PROBLEMS = [
  { word: "tarde.", line: "El cliente de las 9 p. m. le compra a quien contesta primero." },
  { word: "disperso.", line: "Pedidos en WhatsApp, redes y la tienda, cada uno por su lado." },
  { word: "olvidado.", line: "Cotizaciones que nadie retoma y clientes que no vuelven." },
] as const;

/** Las tres cintas de la α (DESIGN §2.1 · reglas de marca §1): coral, ámbar y violeta. */
export const PILLARS = [
  { tone: "brand", word: "vende y cobra.", line: "Más ingresos, menos costos." },
  { tone: "amber", word: "te hace crecer.", line: "Más alcance, más clientes." },
  { tone: "violet", word: "atiende.", line: "Más tiempo, menos carga." },
] as const;

/** La ruta de arranque (método comercial 06 §4 y 10). */
export const STEPS = [
  { word: "1 hora.", line: "Lo configuramos contigo y queda atendiendo tu WhatsApp." },
  { word: "7 días.", line: "Gratis y con todo, desde que recibes tu acceso." },
  { word: "día 5.", line: "Revisamos juntos qué vendió y decides." },
] as const;

/** Nodos de la lámina de integraciones (decisión D2/D3 del plan). Posición en % del lienzo de escritorio. */
export const INTEGRATIONS = [
  { id: "shopify", name: "Shopify", line: "catálogo, stock y pedidos", x: 14, y: 22 },
  { id: "siesa", name: "SIESA", line: "ERP: inventario y facturación", x: 86, y: 22 },
  { id: "pagos", name: "Pagos", line: "tarjeta, PSE y Nequi", x: 9, y: 72 },
  { id: "whatsapp", name: "WhatsApp", line: "y tus redes", x: 91, y: 72 },
  { id: "propio", name: "+ tu sistema", line: "lo conectamos a la medida", x: 50, y: 90 },
] as const;

export function slideIndexById(id: string): number {
  return SLIDES.findIndex((slide) => slide.id === id);
}
