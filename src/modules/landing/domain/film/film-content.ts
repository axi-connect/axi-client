/**
 * El guion de la película, por nicho (plan `landing_cinematica_plan.md` §4).
 *
 * TypeScript puro: textos y cifras de ejemplo, sin React. Los iconos van por
 * nombre (`FilmIcon`) y la UI los traduce a lucide con un mapa cerrado.
 *
 * Reglas del copy (DESIGN.md §7 y landing-copy.md):
 * - Nada que el producto no haga hoy. El pago lo verifica el equipo; el agente
 *   llama y también contesta (entrantes en producción desde el 2026-10-01, plan
 *   §20); los seguimientos salen por WhatsApp con plantilla
 *   aprobada; ningún producto con tallas o colores (knowledge-base §6.4).
 * - Las cifras son de ejemplo y coherentes entre sí; las del mapa se calculan
 *   (`route-scenario.ts`), no se escriben.
 * - Los importes llevan espacio duro tras «$» (`\u00a0`) y las horas entre la cifra
 *   y «a. m./p. m.», para que no se partan al final de una línea.
 */

import type { FilmNiche } from "./niches";
import type { RouteAssumptions } from "./route-scenario";

export type FilmIcon =
  | "utensils"
  | "smartphone"
  | "sparkles"
  | "briefcase"
  | "burger"
  | "cup"
  | "salad"
  | "tablet"
  | "headphones"
  | "watch"
  | "laptop"
  | "droplet"
  | "hand"
  | "package"
  | "box"
  | "shield";

export type Price = { name: string; price: string; icon: FilmIcon };

export type FilmContent = {
  niche: FilmNiche;
  /** Cómo se nombra el nicho en la ficha y en la píldora. */
  label: string;
  icon: FilmIcon;
  /** Lo que escribe un cliente en la ficha de la escena 2. */
  ask: string;
  business: string;
  chat: {
    /**
     * Las horas del chat, como las muestra WhatsApp (sin «p. m.»): los dos turnos
     * y la del teléfono, que es la del último momento de la escena (la venta).
     */
    clock: readonly [string, string, string];
    customer1: string;
    agent1: string;
    /** `note`: la línea corta de la tarjeta del producto (existencias, turno…). */
    product: Price & { note: string };
    customer2: string;
    agent2: string;
    system: string;
    sale: { label: string; amount: string; caption: string };
  };
  photo: { handle: string; catalog: readonly Price[]; matchIndex: number; similarity: string; reply: string };
  radar: {
    /** `prospects`: el radar descubre negocios (B2B). `ads`: llegan leads de tus anuncios. */
    mode: "prospects" | "ads";
    lead: string;
    place: string;
    score: number;
    axes: readonly [string, number][];
    sources: readonly string[];
    decisor: { name: string; role: string; confidence: string } | null;
    contactBy: string;
  };
  followup: { cart: string; template: string; reply: string; recovered: string };
  call: { business: string; customer: string; lines: readonly [who: "axi" | "cliente", text: string][]; outcome: string };
  vault: { ask: string; answer: string };
  team: { customer: string; ask: string; reply: string; operator: string };
  collect: {
    order: string;
    customer: string;
    total: string;
    parts: readonly [label: string, amount: string][];
    remaining: string;
    /** El último pago del recibo: su nombre y su estado antes y después de pagarse. */
    last: { label: string; due: string; paid: string };
    /** Quién paga ese último pago (el aviso «Andrés pagó la cuota 3» de la cabecera). */
    payer: string;
    reminder: string;
    promiseReply: string;
    promise: string;
    document: string;
  };
  pipeline: { card: { name: string; detail: string }; forecast: string; appointment: { weekday: string; day: string; time: string; title: string; who: string } };
  route: RouteAssumptions & { steps: readonly [string, string, string]; axiRoute: string };
  axel: { name: string; summary: string; chips: readonly string[]; proposals: readonly { type: string; title: string; meta: string; status: string }[] };
  measure: { steps: readonly [label: string, value: string][]; produced: string; quality: number };
};

/** Calidad del agente (0–100) y su procedencia fija: la evalúa una IA supervisora. */
const Q = 92;

const RESTAURANTS: FilmContent = {
  niche: "restaurants",
  label: "Restaurantes",
  icon: "utensils",
  ask: "¿Tienen domicilio a Laureles?",
  business: "Fuego & Pan · Medellín",
  chat: {
    clock: ["9:15", "9:16", "9:21"],
    customer1: "Hola, ¿tienen domicilio a Laureles?",
    agent1: "¡Sí! Llegamos a Laureles en 35 min. Te comparto el más pedido.",
    product: { name: "Combo Doble Fuego", price: "$\u00a038.900", icon: "burger", note: "El más pedido" },
    customer2: "Dame 2 combos",
    agent2: "Listo: pedido #1042 por $\u00a083.800 con domicilio. Pagas por Nequi o al recibir.",
    system: "Pedido confirmado · sale en 5 min",
    sale: { label: "Venta pagada", amount: "$\u00a083.800", caption: "verificada por tu equipo ·\u00a09:21\u00a0p.\u00a0m." },
  },
  photo: {
    handle: "@fuegoypan",
    catalog: [
      { name: "Combo Clásico", price: "$\u00a029.900", icon: "burger" },
      { name: "Combo Doble Fuego", price: "$\u00a038.900", icon: "burger" },
      { name: "Combo Pollo Crispy", price: "$\u00a032.900", icon: "burger" },
      { name: "Ensalada César", price: "$\u00a024.900", icon: "salad" },
      { name: "Limonada de coco", price: "$\u00a09.900", icon: "cup" },
      { name: "Malteada", price: "$\u00a012.900", icon: "cup" },
    ],
    matchIndex: 1,
    similarity: "0,94",
    reply: "Es el Combo Doble Fuego: $\u00a038.900. ¿Te lo mando ya?",
  },
  radar: {
    mode: "ads",
    lead: "Andrea Ruiz",
    place: "Llegó por tu anuncio «Almuerzos para empresas»",
    score: 84,
    axes: [["Contactabilidad", 95], ["Identidad", 80], ["Ajuste a tu cliente ideal", 82], ["Procedencia", 79]],
    sources: ["Click-to-WhatsApp", "Formulario de anuncio", "Teléfono"],
    decisor: null,
    contactBy: "WhatsApp: ella escribió primero",
  },
  followup: {
    cart: "Armó un pedido de $\u00a083.800 y no lo terminó",
    template: "Hola Andrea, tu pedido sigue listo para salir. ¿Te lo enviamos? Responde SÍ y sale en 35 min.",
    reply: "Sí, mándalo",
    recovered: "Venta recuperada · $\u00a083.800",
  },
  call: {
    business: "Fuego & Pan",
    customer: "Andrea",
    lines: [
      ["axi", "Hola Andrea, te llamo de Fuego & Pan por los almuerzos que cotizaste para tu equipo."],
      ["cliente", "Sí, somos 30. ¿Alcanzan para el viernes?"],
      ["axi", "Claro. Si confirmas hoy, te los llevamos el viernes a las 12:30."],
      ["cliente", "Listo, confirmado."],
    ],
    outcome: "30 almuerzos confirmados",
  },
  vault: { ask: "¿Me dejas el combo a 30 mil?", answer: "Puedo aplicarte el cupón VIERNES10: queda en $\u00a035.010." },
  team: { customer: "Andrea Ruiz", ask: "¿Puedo hablar con una persona? El pedido llegó frío.", reply: "Hola Andrea, soy Laura. Qué pena: te enviamos otro ya mismo, sin costo.", operator: "Laura" },
  collect: {
    order: "Pedido #1098",
    customer: "Almuerzos Grupo Sol · octubre",
    total: "$\u00a02.450.000",
    parts: [["Anticipo · verificado", "$\u00a01.000.000"], ["Abono 2 · verificado", "$\u00a0800.000"]],
    remaining: "$\u00a0650.000",
    last: { label: "Saldo", due: "Vence el 16 oct", paid: "Pagado el 19 oct" },
    payer: "Andrea",
    reminder: "Hola Andrea, el saldo de los almuerzos de octubre, $\u00a0650.000, vence el viernes 16. Te dejo los medios de pago.",
    promiseReply: "Pago el lunes sin falta",
    promise: "Promesa · lunes 19 · recordatorios en pausa",
    document: "Cuenta de cobro · N.º 0142",
  },
  pipeline: {
    card: { name: "Andrea Ruiz", detail: "30 almuerzos · $\u00a01.170.000" },
    forecast: "$\u00a09,4 M",
    appointment: { weekday: "VIE", day: "9", time: "12:30\u00a0p.\u00a0m.", title: "Almuerzo Grupo Sol", who: "Andrea · recordatorio 24 h antes ✓" },
  },
  route: {
    goal: 36_000_000,
    ticket: 42_000,
    businessDaysLeft: 6,
    unitPlural: "pedidos",
    steps: ["Cierra 53 pedidos hoy", "Retoma 12 carritos", "Confirma 3 almuerzos de empresa"],
    axiRoute: "Escribir a 31 clientes que no piden hace un mes",
  },
  axel: {
    name: "Camila",
    summary: "Ayer salieron 96 pedidos y 31 clientes no han vuelto este mes. Hoy te propongo escribirles antes del almuerzo.",
    chips: ["3 almuerzos de empresa", "31 clientes por volver"],
    proposals: [
      { type: "Recuperación", title: "Escribir a 31 clientes que no piden hace un mes", meta: "Solo mensaje · sin descuento", status: "Por decidir" },
      { type: "Promoción", title: "Combo 2×1 los martes", meta: "Margen protegido · tope de 200 canjes", status: "Por decidir" },
      { type: "Ritmo de la meta", title: "Con 53 pedidos al día llegas el 30", meta: "según tu historia", status: "Hallazgo" },
    ],
  },
  measure: { steps: [["Conversaciones", "3.480"], ["Cotizaciones", "2.310"], ["Pedidos", "1.920"], ["Ventas pagadas", "1.804"]], produced: "$\u00a075,8 M", quality: Q },
};

const TECH: FilmContent = {
  niche: "tech",
  label: "Tecnología",
  icon: "smartphone",
  ask: "¿Tienen el iPhone 17 de 256?",
  business: "Tecnología Medellín",
  chat: {
    clock: ["8:47", "8:49", "8:53"],
    customer1: "Hola, ¿tienen el iPhone 17 de 256?",
    agent1: "¡Sí! Nos quedan 3 en tienda. Te comparto la foto.",
    product: { name: "iPhone 17 · 256 GB", price: "$\u00a04.899.000", icon: "smartphone", note: "3 en tienda" },
    customer2: "Me lo llevo. ¿Cómo pago?",
    agent2: "Listo: pedido #2087 por $\u00a04.899.000. Puedes pagar por Nequi o Bancolombia.",
    system: "Pago reportado · lo verifica tu equipo",
    sale: { label: "Venta pagada", amount: "$\u00a04.899.000", caption: "verificada por tu equipo ·\u00a08:53\u00a0p.\u00a0m." },
  },
  photo: {
    handle: "@techmedellin",
    catalog: [
      { name: "iPhone 16 · 128 GB", price: "$\u00a03.899.000", icon: "smartphone" },
      { name: "iPhone 17 · 256 GB", price: "$\u00a04.899.000", icon: "smartphone" },
      { name: "iPhone 17 Pro", price: "$\u00a06.299.000", icon: "smartphone" },
      { name: "iPad Air", price: "$\u00a03.499.000", icon: "tablet" },
      { name: "AirPods Pro", price: "$\u00a01.249.000", icon: "headphones" },
      { name: "MacBook Air", price: "$\u00a05.999.000", icon: "laptop" },
    ],
    matchIndex: 1,
    similarity: "0,93",
    reply: "Es el iPhone 17 de 256 GB: $\u00a04.899.000. ¿Te lo aparto?",
  },
  radar: {
    mode: "ads",
    lead: "Andrés Gómez",
    place: "Llegó por tu anuncio «iPhone 17 en cuotas»",
    score: 88,
    axes: [["Contactabilidad", 96], ["Identidad", 86], ["Ajuste a tu cliente ideal", 84], ["Procedencia", 85]],
    sources: ["Click-to-WhatsApp", "Formulario de anuncio", "Teléfono"],
    decisor: null,
    contactBy: "WhatsApp: él escribió primero",
  },
  followup: {
    cart: "Cotizó un iPhone 17 de $\u00a04.899.000 y no confirmó",
    template: "Hola Andrés, tu iPhone 17 sigue apartado hasta hoy. ¿Te lo enviamos? Responde SÍ y lo despachamos.",
    reply: "Sí, envíalo hoy",
    recovered: "Venta recuperada · $\u00a04.899.000",
  },
  call: {
    business: "Tecnología Medellín",
    customer: "Andrés",
    lines: [
      ["axi", "Hola Andrés, te llamo de Tecnología Medellín por el iPhone que cotizaste ayer."],
      ["cliente", "Sí, justo lo estaba pensando. ¿Me lo pueden llevar hoy?"],
      ["axi", "Claro. Si confirmas ahora, sale en el despacho de las 3 p. m."],
      ["cliente", "Hágale, confírmelo."],
    ],
    outcome: "pedido confirmado",
  },
  vault: { ask: "¿Me lo dejas en 4 millones?", answer: "Puedo aplicarte el cupón OCTUBRE10: queda en $\u00a04.409.100." },
  team: { customer: "Andrés Gómez", ask: "¿Puedo hablar con una persona? Es por la garantía.", reply: "Hola Andrés, soy Laura. Te ayudo con la garantía ahora mismo.", operator: "Laura" },
  collect: {
    order: "Pedido #2087",
    customer: "Andrés Gómez",
    total: "$\u00a04.899.000",
    parts: [["Anticipo · verificado", "$\u00a01.500.000"], ["Cuota 2 · verificada", "$\u00a01.700.000"]],
    remaining: "$\u00a01.699.000",
    last: { label: "Cuota 3", due: "Vence el 16 oct", paid: "Pagada el 19 oct" },
    payer: "Andrés",
    reminder: "Hola Andrés, la cuota 3 de 3 por $\u00a01.699.000 vence el viernes 16 de octubre. Te dejo los medios de pago.",
    promiseReply: "Pago el lunes sin falta",
    promise: "Promesa · lunes 19 · recordatorios en pausa",
    document: "Recibo de pago · N.º 0142",
  },
  pipeline: {
    card: { name: "Andrés Gómez", detail: "iPhone 17 · $\u00a04.899.000" },
    forecast: "$\u00a038,2 M",
    appointment: { weekday: "SÁB", day: "3", time: "10:00\u00a0a.\u00a0m.", title: "Entrega y configuración", who: "Andrés · recordatorio 24 h antes ✓" },
  },
  route: {
    goal: 30_000_000,
    ticket: 925_000,
    businessDaysLeft: 6,
    unitPlural: "ventas",
    steps: ["Cierra 2 ventas hoy", "Envía 5 cotizaciones", "Agenda 3 entregas"],
    axiRoute: "Retomar 14 cotizaciones frías",
  },
  axel: {
    name: "Camila",
    summary: "Ayer cerraste 3 ventas y quedaron 14 cotizaciones sin respuesta. Hoy te propongo retomarlas antes de las 10.",
    chips: ["3 ventas ayer", "14 cotizaciones frías"],
    proposals: [
      { type: "Recuperación", title: "Retomar 14 cotizaciones frías mañana a las 9:00", meta: "Solo mensaje · sin descuento", status: "Por decidir" },
      { type: "Campaña", title: "Clientes que compraron hace 60 días", meta: "212 contactos · plantilla aprobada", status: "Por decidir" },
      { type: "Ritmo de la meta", title: "Con 2 ventas al día llegas el 30", meta: "según tu historia", status: "Hallazgo" },
    ],
  },
  measure: { steps: [["Conversaciones", "1.240"], ["Cotizaciones", "312"], ["Pedidos", "148"], ["Ventas pagadas", "121"]], produced: "$\u00a048,6 M", quality: Q },
};

const BEAUTY: FilmContent = {
  niche: "beauty",
  label: "Salud y belleza",
  icon: "sparkles",
  ask: "¿Hay cita para el sábado?",
  business: "Estética Lumière · Bogotá",
  chat: {
    clock: ["10:58", "10:59", "11:04"],
    customer1: "Hola, ¿hay cita para el sábado?",
    agent1: "Tengo el sábado a las 10:00\u00a0a.\u00a0m. o a las 3:00\u00a0p.\u00a0m. para limpieza facial.",
    product: { name: "Limpieza facial profunda", price: "$\u00a0180.000", icon: "sparkles", note: "Sábado ·\u00a010:00\u00a0a.\u00a0m." },
    customer2: "A las 10, porfa",
    agent2: "Quedó agendada el sábado a las 10:00\u00a0a.\u00a0m. Te recuerdo un día antes. Anticipo por Nequi: $\u00a050.000.",
    system: "Cita agendada · recordatorio 24 h antes",
    sale: { label: "Anticipo pagado", amount: "$\u00a050.000", caption: "verificado por tu equipo ·\u00a011:04\u00a0a.\u00a0m." },
  },
  photo: {
    handle: "@lumiere.bogota",
    catalog: [
      { name: "Limpieza facial", price: "$\u00a0180.000", icon: "sparkles" },
      { name: "Hidrafacial", price: "$\u00a0260.000", icon: "droplet" },
      { name: "Peeling químico", price: "$\u00a0220.000", icon: "droplet" },
      { name: "Manicura spa", price: "$\u00a065.000", icon: "hand" },
      { name: "Depilación láser", price: "$\u00a0150.000", icon: "sparkles" },
      { name: "Masaje relajante", price: "$\u00a0140.000", icon: "hand" },
    ],
    matchIndex: 1,
    similarity: "0,91",
    reply: "Es nuestro Hidrafacial: $\u00a0260.000, 60 minutos. ¿Te busco un horario?",
  },
  radar: {
    mode: "ads",
    lead: "Valentina Ríos",
    place: "Llegó por tu anuncio «Tu piel lista para diciembre»",
    score: 86,
    axes: [["Contactabilidad", 94], ["Identidad", 83], ["Ajuste a tu cliente ideal", 86], ["Procedencia", 81]],
    sources: ["Click-to-WhatsApp", "Formulario de anuncio", "Teléfono"],
    decisor: null,
    contactBy: "WhatsApp: ella escribió primero",
  },
  followup: {
    cart: "Preguntó por el Hidrafacial y no agendó",
    template: "Hola Valentina, nos queda un horario el sábado a las 3:00\u00a0p.\u00a0m. para tu Hidrafacial. ¿Te lo reservo?",
    reply: "Sí, resérvamelo",
    recovered: "Cita recuperada · $\u00a0260.000",
  },
  call: {
    business: "Estética Lumière",
    customer: "Valentina",
    lines: [
      ["axi", "Hola Valentina, te llamo de Estética Lumière para confirmar tu cita del sábado a las 10."],
      ["cliente", "Sí, ahí estaré. ¿Puedo llegar un poco antes?"],
      ["axi", "Claro, te esperamos desde las 9:45. ¿Te confirmo?"],
      ["cliente", "Perfecto, gracias."],
    ],
    outcome: "cita confirmada",
  },
  vault: { ask: "¿Me haces el facial a 150?", answer: "Con el cupón PRIMERAVEZ te queda en $\u00a0162.000, el precio de tu primera cita." },
  team: { customer: "Valentina Ríos", ask: "¿Puedo hablar con una persona? Tengo una duda de mi piel.", reply: "Hola Valentina, soy Laura, la esteticista. Cuéntame y lo revisamos.", operator: "Laura" },
  collect: {
    order: "Plan #0311",
    customer: "Valentina Ríos · 6 sesiones de láser",
    total: "$\u00a0900.000",
    parts: [["Anticipo · verificado", "$\u00a0300.000"], ["Cuota 2 · verificada", "$\u00a0300.000"]],
    remaining: "$\u00a0300.000",
    last: { label: "Cuota 3", due: "Vence el 16 oct", paid: "Pagada el 19 oct" },
    payer: "Valentina",
    reminder: "Hola Valentina, la cuota 3 de 3 de tu plan de láser, $\u00a0300.000, vence el viernes 16 de octubre.",
    promiseReply: "Te pago el lunes",
    promise: "Promesa · lunes 19 · recordatorios en pausa",
    document: "Recibo de pago · N.º 0142",
  },
  pipeline: {
    card: { name: "Valentina Ríos", detail: "Plan láser · $\u00a0900.000" },
    forecast: "$\u00a012,6 M",
    appointment: { weekday: "SÁB", day: "3", time: "10:00\u00a0a.\u00a0m.", title: "Limpieza facial profunda", who: "Valentina · recordatorio 24 h antes ✓" },
  },
  route: {
    goal: 18_000_000,
    ticket: 160_000,
    businessDaysLeft: 6,
    unitPlural: "citas",
    steps: ["Agenda 7 citas hoy", "Confirma las 12 de mañana", "Retoma 4 planes sin terminar"],
    axiRoute: "Invitar a 40 clientas que no vienen hace 60 días",
  },
  axel: {
    name: "Camila",
    summary: "Esta semana tienes 9 huecos libres el martes y 40 clientas que no vuelven hace dos meses. Te propongo invitarlas.",
    chips: ["9 huecos el martes", "40 clientas por volver"],
    proposals: [
      { type: "Recuperación", title: "Invitar a 40 clientas que no vienen hace 60 días", meta: "Solo mensaje · sin descuento", status: "Por decidir" },
      { type: "Promoción", title: "Martes de hidratación: 15 % en Hidrafacial", meta: "Tope de 20 citas · margen protegido", status: "Por decidir" },
      { type: "Ritmo de la meta", title: "Con 7 citas al día llegas el 30", meta: "según tu historia", status: "Hallazgo" },
    ],
  },
  measure: { steps: [["Conversaciones", "860"], ["Cotizaciones", "402"], ["Citas agendadas", "221"], ["Citas pagadas", "184"]], produced: "$\u00a029,4 M", quality: Q },
};

const B2B: FilmContent = {
  niche: "b2b",
  label: "Servicios y B2B",
  icon: "briefcase",
  ask: "¿Me cotizas 200 cajas de guantes?",
  business: "Suministros Andina · Itagüí",
  chat: {
    clock: ["3:12", "3:14", "3:16"],
    customer1: "Buenas, ¿me cotizas 200 cajas de guantes de nitrilo?",
    agent1: "Claro. Por volumen, la caja por 100 queda en $\u00a024.500.",
    product: { name: "Guantes de nitrilo · caja × 100", price: "$\u00a024.500 c/u", icon: "box", note: "Precio por volumen" },
    customer2: "Mándame la cotización formal",
    agent2: "Listo: cotización COT-0318 por $\u00a04.900.000 enviada en PDF. ¿La convierto en pedido?",
    system: "Cotización enviada · PDF",
    sale: { label: "Cotización enviada", amount: "$\u00a04.900.000", caption: "COT-0318 · válida por 15 días" },
  },
  photo: {
    handle: "Foto del cliente",
    catalog: [
      { name: "Guantes de nitrilo", price: "$\u00a024.500", icon: "box" },
      { name: "Tapabocas N95 × 20", price: "$\u00a038.000", icon: "shield" },
      { name: "Gel antibacterial 1 L", price: "$\u00a014.900", icon: "droplet" },
      { name: "Toallas de papel", price: "$\u00a052.000", icon: "package" },
      { name: "Bata desechable", price: "$\u00a03.200", icon: "shield" },
      { name: "Alcohol 70 % 1 L", price: "$\u00a09.800", icon: "droplet" },
    ],
    matchIndex: 0,
    similarity: "0,92",
    reply: "Es nuestra caja de guantes de nitrilo × 100: $\u00a024.500. ¿Cuántas necesitas?",
  },
  radar: {
    mode: "prospects",
    lead: "Clínica Santa Fe",
    place: "Itagüí · Salud",
    score: 86,
    axes: [["Contactabilidad", 92], ["Identidad", 88], ["Ajuste a tu cliente ideal", 81], ["Procedencia", 84]],
    sources: ["Google Maps", "Sitio web", "Teléfono"],
    decisor: { name: "Marta Restrepo", role: "Directora de compras", confidence: "Confianza alta · 3 fuentes concuerdan" },
    contactBy: "Puedo contactar por: Correo · Llamada",
  },
  followup: {
    cart: "Recibió la cotización COT-0318 y no respondió",
    template: "Hola Marta, la cotización COT-0318 vence el viernes. ¿La convertimos en pedido para despachar el lunes?",
    reply: "Sí, háganle",
    recovered: "Pedido cerrado · $\u00a04.900.000",
  },
  call: {
    business: "Suministros Andina",
    customer: "Marta",
    lines: [
      ["axi", "Hola Marta, te llamo de Suministros Andina por la cotización de guantes que te enviamos."],
      ["cliente", "Sí, la vi. ¿El despacho sería esta semana?"],
      ["axi", "Si la apruebas hoy, sale el lunes a primera hora."],
      ["cliente", "Listo, la apruebo."],
    ],
    outcome: "cotización aprobada",
  },
  vault: { ask: "¿Me las dejas en 20 mil la caja?", answer: "Desde 500 cajas el precio por volumen es $\u00a022.900. Para 200 queda en $\u00a024.500." },
  team: { customer: "Marta Restrepo", ask: "¿Puedo hablar con un asesor? Necesito crédito a 60 días.", reply: "Hola Marta, soy Laura, de cartera. Revisamos tu cupo ahora mismo.", operator: "Laura" },
  collect: {
    order: "Pedido #3120",
    customer: "Clínica Santa Fe",
    total: "$\u00a04.900.000",
    parts: [["Anticipo · verificado", "$\u00a01.500.000"], ["Abono 2 · verificado", "$\u00a01.700.000"]],
    remaining: "$\u00a01.700.000",
    last: { label: "Saldo", due: "Vence el 16 oct", paid: "Pagado el 19 oct" },
    payer: "Marta",
    reminder: "Hola Marta, el saldo del pedido #3120, $\u00a01.700.000, vence el viernes 16 de octubre. Te dejo los datos de pago.",
    promiseReply: "Lo giramos el lunes",
    promise: "Promesa · lunes 19 · recordatorios en pausa",
    document: "Estado de cuenta · N.º 0142",
  },
  pipeline: {
    card: { name: "Clínica Santa Fe", detail: "200 cajas · $\u00a04.900.000" },
    forecast: "$\u00a086,5 M",
    appointment: { weekday: "MAR", day: "6", time: "9:00\u00a0a.\u00a0m.", title: "Visita de muestras", who: "Marta · recordatorio 24 h antes ✓" },
  },
  route: {
    goal: 120_000_000,
    ticket: 4_900_000,
    businessDaysLeft: 6,
    unitPlural: "pedidos",
    steps: ["Cierra 2 pedidos hoy", "Envía 4 cotizaciones", "Agenda 2 visitas"],
    axiRoute: "Retomar 9 cotizaciones sin respuesta",
  },
  axel: {
    name: "Camila",
    summary: "Tienes 9 cotizaciones sin respuesta por $\u00a038 M y 3 clientes que suelen recomprar este mes. Te propongo retomarlas hoy.",
    chips: ["9 cotizaciones abiertas", "3 recompras esperadas"],
    proposals: [
      { type: "Recuperación", title: "Retomar 9 cotizaciones sin respuesta", meta: "Solo mensaje · sin descuento", status: "Por decidir" },
      { type: "Recompra", title: "Recordar su pedido a 3 clientes recurrentes", meta: "según su historial de compra", status: "Por decidir" },
      { type: "Ritmo de la meta", title: "Con 2 pedidos al día llegas el 30", meta: "según tu historia", status: "Hallazgo" },
    ],
  },
  measure: { steps: [["Conversaciones", "420"], ["Cotizaciones", "186"], ["Pedidos", "64"], ["Pedidos pagados", "58"]], produced: "$\u00a0284 M", quality: Q },
};

export const FILM_CONTENT: Readonly<Record<FilmNiche, FilmContent>> = {
  restaurants: RESTAURANTS,
  tech: TECH,
  beauty: BEAUTY,
  b2b: B2B,
};
