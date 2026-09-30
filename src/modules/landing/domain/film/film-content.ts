/**
 * El guion de la película, por nicho (plan `landing_cinematica_plan.md` §4).
 *
 * TypeScript puro: textos y cifras de ejemplo, sin React. Los iconos van por
 * nombre (`FilmIcon`) y la UI los traduce a lucide con un mapa cerrado.
 *
 * Reglas del copy (DESIGN.md §7 y landing-copy.md):
 * - Nada que el producto no haga hoy. El pago lo verifica el equipo; las
 *   llamadas son salientes; los seguimientos salen por WhatsApp con plantilla
 *   aprobada; ningún producto con tallas o colores (knowledge-base §6.4).
 * - Las cifras son de ejemplo y coherentes entre sí; las del mapa se calculan
 *   (`route-scenario.ts`), no se escriben.
 * - Los importes van con espacio duro tras «$» para que no se partan.
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
    customer1: string;
    agent1: string;
    product: Price;
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
    customer1: "Hola, ¿tienen domicilio a Laureles?",
    agent1: "¡Sí! Llegamos a Laureles en 35 min. Te comparto el más pedido.",
    product: { name: "Combo Doble Fuego", price: "$ 38.900", icon: "burger" },
    customer2: "Dame 2 combos",
    agent2: "Listo: pedido #1042 por $ 83.800 con domicilio. Pagas por Nequi o al recibir.",
    system: "Pedido confirmado · sale en 5 min",
    sale: { label: "Venta pagada", amount: "$ 83.800", caption: "verificada por tu equipo · 9:21 p. m." },
  },
  photo: {
    handle: "@fuegoypan",
    catalog: [
      { name: "Combo Clásico", price: "$ 29.900", icon: "burger" },
      { name: "Combo Doble Fuego", price: "$ 38.900", icon: "burger" },
      { name: "Combo Pollo Crispy", price: "$ 32.900", icon: "burger" },
      { name: "Ensalada César", price: "$ 24.900", icon: "salad" },
      { name: "Limonada de coco", price: "$ 9.900", icon: "cup" },
      { name: "Malteada", price: "$ 12.900", icon: "cup" },
    ],
    matchIndex: 1,
    similarity: "0,94",
    reply: "Es el Combo Doble Fuego: $ 38.900. ¿Te lo mando ya?",
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
    cart: "Armó un pedido de $ 83.800 y no lo terminó",
    template: "Hola Andrea, tu pedido sigue listo para salir. ¿Te lo enviamos? Responde SÍ y sale en 35 min.",
    reply: "Sí, mándalo",
    recovered: "Venta recuperada · $ 83.800",
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
  vault: { ask: "¿Me dejas el combo a 30 mil?", answer: "Puedo aplicarte el cupón VIERNES10: queda en $ 35.010." },
  team: { customer: "Andrea Ruiz", ask: "¿Puedo hablar con una persona? El pedido llegó frío.", reply: "Hola Andrea, soy Laura. Qué pena: te enviamos otro ya mismo, sin costo.", operator: "Laura" },
  collect: {
    order: "Pedido #1098",
    customer: "Almuerzos Grupo Sol · octubre",
    total: "$ 2.450.000",
    parts: [["Anticipo · verificado", "$ 1.000.000"], ["Abono 2 · verificado", "$ 800.000"]],
    remaining: "$ 650.000",
    reminder: "Hola Andrea, el saldo de los almuerzos de octubre, $ 650.000, vence el viernes 16. Te dejo los medios de pago.",
    promiseReply: "Pago el lunes sin falta",
    promise: "Promesa · lunes 19 · recordatorios en pausa",
    document: "Cuenta de cobro · N.º 0142",
  },
  pipeline: {
    card: { name: "Andrea Ruiz", detail: "30 almuerzos · $ 1.170.000" },
    forecast: "$ 9,4 M",
    appointment: { weekday: "VIE", day: "9", time: "12:30 p. m.", title: "Almuerzo Grupo Sol", who: "Andrea · recordatorio 24 h antes ✓" },
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
  measure: { steps: [["Conversaciones", "3.480"], ["Cotizaciones", "2.310"], ["Pedidos", "1.920"], ["Ventas pagadas", "1.804"]], produced: "$ 75,8 M", quality: Q },
};

const TECH: FilmContent = {
  niche: "tech",
  label: "Tecnología",
  icon: "smartphone",
  ask: "¿Tienen el iPhone 17 de 256?",
  business: "Tecnología Medellín",
  chat: {
    customer1: "Hola, ¿tienen el iPhone 17 de 256?",
    agent1: "¡Sí! Nos quedan 3 en tienda. Te comparto la foto.",
    product: { name: "iPhone 17 · 256 GB", price: "$ 4.899.000", icon: "smartphone" },
    customer2: "Me lo llevo. ¿Cómo pago?",
    agent2: "Listo: pedido #2087 por $ 4.899.000. Puedes pagar por Nequi, Bancolombia o link de pago.",
    system: "Pago reportado · lo verifica tu equipo",
    sale: { label: "Venta pagada", amount: "$ 4.899.000", caption: "verificada por tu equipo · 8:53 p. m." },
  },
  photo: {
    handle: "@techmedellin",
    catalog: [
      { name: "iPhone 16 · 128 GB", price: "$ 3.899.000", icon: "smartphone" },
      { name: "iPhone 17 · 256 GB", price: "$ 4.899.000", icon: "smartphone" },
      { name: "iPhone 17 Pro", price: "$ 6.299.000", icon: "smartphone" },
      { name: "iPad Air", price: "$ 3.499.000", icon: "tablet" },
      { name: "AirPods Pro", price: "$ 1.249.000", icon: "headphones" },
      { name: "MacBook Air", price: "$ 5.999.000", icon: "laptop" },
    ],
    matchIndex: 1,
    similarity: "0,93",
    reply: "Es el iPhone 17 de 256 GB: $ 4.899.000. ¿Te lo aparto?",
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
    cart: "Cotizó un iPhone 17 de $ 4.899.000 y no confirmó",
    template: "Hola Andrés, tu iPhone 17 sigue apartado hasta hoy. ¿Te lo enviamos? Responde SÍ y lo despachamos.",
    reply: "Sí, envíalo hoy",
    recovered: "Venta recuperada · $ 4.899.000",
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
  vault: { ask: "¿Me lo dejas en 4 millones?", answer: "Puedo aplicarte el cupón OCTUBRE10: queda en $ 4.409.100." },
  team: { customer: "Andrés Gómez", ask: "¿Puedo hablar con una persona? Es por la garantía.", reply: "Hola Andrés, soy Laura. Te ayudo con la garantía ahora mismo.", operator: "Laura" },
  collect: {
    order: "Pedido #2087",
    customer: "Andrés Gómez",
    total: "$ 4.899.000",
    parts: [["Anticipo · verificado", "$ 1.500.000"], ["Cuota 2 · verificada", "$ 1.700.000"]],
    remaining: "$ 1.699.000",
    reminder: "Hola Andrés, la cuota 3 de 3 por $ 1.699.000 vence el viernes 16 de octubre. Te dejo los medios de pago.",
    promiseReply: "Pago el lunes sin falta",
    promise: "Promesa · lunes 19 · recordatorios en pausa",
    document: "Recibo de pago · N.º 0142",
  },
  pipeline: {
    card: { name: "Andrés Gómez", detail: "iPhone 17 · $ 4.899.000" },
    forecast: "$ 38,2 M",
    appointment: { weekday: "SÁB", day: "3", time: "10:00 a. m.", title: "Entrega y configuración", who: "Andrés · recordatorio 24 h antes ✓" },
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
  measure: { steps: [["Conversaciones", "1.240"], ["Cotizaciones", "312"], ["Pedidos", "148"], ["Ventas pagadas", "121"]], produced: "$ 48,6 M", quality: Q },
};

const BEAUTY: FilmContent = {
  niche: "beauty",
  label: "Salud y belleza",
  icon: "sparkles",
  ask: "¿Hay cita para el sábado?",
  business: "Estética Lumière · Bogotá",
  chat: {
    customer1: "Hola, ¿hay cita para el sábado?",
    agent1: "Tengo el sábado a las 10:00 a. m. o a las 3:00 p. m. para limpieza facial.",
    product: { name: "Limpieza facial profunda", price: "$ 180.000", icon: "sparkles" },
    customer2: "A las 10, porfa",
    agent2: "Quedó agendada el sábado a las 10:00 a. m. Te recuerdo un día antes. Anticipo por Nequi: $ 50.000.",
    system: "Cita agendada · recordatorio 24 h antes",
    sale: { label: "Anticipo pagado", amount: "$ 50.000", caption: "verificado por tu equipo · 11:04 a. m." },
  },
  photo: {
    handle: "@lumiere.bogota",
    catalog: [
      { name: "Limpieza facial", price: "$ 180.000", icon: "sparkles" },
      { name: "Hidrafacial", price: "$ 260.000", icon: "droplet" },
      { name: "Peeling químico", price: "$ 220.000", icon: "droplet" },
      { name: "Manicura spa", price: "$ 65.000", icon: "hand" },
      { name: "Depilación láser", price: "$ 150.000", icon: "sparkles" },
      { name: "Masaje relajante", price: "$ 140.000", icon: "hand" },
    ],
    matchIndex: 1,
    similarity: "0,91",
    reply: "Es nuestro Hidrafacial: $ 260.000, 60 minutos. ¿Te busco un horario?",
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
    template: "Hola Valentina, nos queda un horario el sábado a las 3:00 p. m. para tu Hidrafacial. ¿Te lo reservo?",
    reply: "Sí, resérvamelo",
    recovered: "Cita recuperada · $ 260.000",
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
  vault: { ask: "¿Me haces el facial a 150?", answer: "Con el cupón PRIMERAVEZ te queda en $ 162.000, el precio de tu primera cita." },
  team: { customer: "Valentina Ríos", ask: "¿Puedo hablar con una persona? Tengo una duda de mi piel.", reply: "Hola Valentina, soy Laura, la esteticista. Cuéntame y lo revisamos.", operator: "Laura" },
  collect: {
    order: "Plan #0311",
    customer: "Valentina Ríos · 6 sesiones de láser",
    total: "$ 900.000",
    parts: [["Anticipo · verificado", "$ 300.000"], ["Cuota 2 · verificada", "$ 300.000"]],
    remaining: "$ 300.000",
    reminder: "Hola Valentina, la cuota 3 de 3 de tu plan de láser, $ 300.000, vence el viernes 16 de octubre.",
    promiseReply: "Te pago el lunes",
    promise: "Promesa · lunes 19 · recordatorios en pausa",
    document: "Recibo de pago · N.º 0142",
  },
  pipeline: {
    card: { name: "Valentina Ríos", detail: "Plan láser · $ 900.000" },
    forecast: "$ 12,6 M",
    appointment: { weekday: "SÁB", day: "3", time: "10:00 a. m.", title: "Limpieza facial profunda", who: "Valentina · recordatorio 24 h antes ✓" },
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
  measure: { steps: [["Conversaciones", "860"], ["Cotizaciones", "402"], ["Citas agendadas", "221"], ["Citas pagadas", "184"]], produced: "$ 29,4 M", quality: Q },
};

const B2B: FilmContent = {
  niche: "b2b",
  label: "Servicios y B2B",
  icon: "briefcase",
  ask: "¿Me cotizas 200 cajas de guantes?",
  business: "Suministros Andina · Itagüí",
  chat: {
    customer1: "Buenas, ¿me cotizas 200 cajas de guantes de nitrilo?",
    agent1: "Claro. Por volumen, la caja por 100 queda en $ 24.500.",
    product: { name: "Guantes de nitrilo · caja × 100", price: "$ 24.500 c/u", icon: "box" },
    customer2: "Mándame la cotización formal",
    agent2: "Listo: cotización COT-0318 por $ 4.900.000 enviada en PDF. ¿La convierto en pedido?",
    system: "Cotización enviada · PDF",
    sale: { label: "Cotización enviada", amount: "$ 4.900.000", caption: "COT-0318 · válida por 15 días" },
  },
  photo: {
    handle: "Foto del cliente",
    catalog: [
      { name: "Guantes de nitrilo", price: "$ 24.500", icon: "box" },
      { name: "Tapabocas N95 × 20", price: "$ 38.000", icon: "shield" },
      { name: "Gel antibacterial 1 L", price: "$ 14.900", icon: "droplet" },
      { name: "Toallas de papel", price: "$ 52.000", icon: "package" },
      { name: "Bata desechable", price: "$ 3.200", icon: "shield" },
      { name: "Alcohol 70 % 1 L", price: "$ 9.800", icon: "droplet" },
    ],
    matchIndex: 0,
    similarity: "0,92",
    reply: "Es nuestra caja de guantes de nitrilo × 100: $ 24.500. ¿Cuántas necesitas?",
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
    recovered: "Pedido cerrado · $ 4.900.000",
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
  vault: { ask: "¿Me las dejas en 20 mil la caja?", answer: "Desde 500 cajas el precio por volumen es $ 22.900. Para 200 queda en $ 24.500." },
  team: { customer: "Marta Restrepo", ask: "¿Puedo hablar con un asesor? Necesito crédito a 60 días.", reply: "Hola Marta, soy Laura, de cartera. Revisamos tu cupo ahora mismo.", operator: "Laura" },
  collect: {
    order: "Pedido #3120",
    customer: "Clínica Santa Fe",
    total: "$ 4.900.000",
    parts: [["Anticipo · verificado", "$ 1.500.000"], ["Abono 2 · verificado", "$ 1.700.000"]],
    remaining: "$ 1.700.000",
    reminder: "Hola Marta, el saldo del pedido #3120, $ 1.700.000, vence el viernes 16 de octubre. Te dejo los datos de pago.",
    promiseReply: "Lo giramos el lunes",
    promise: "Promesa · lunes 19 · recordatorios en pausa",
    document: "Estado de cuenta · N.º 0142",
  },
  pipeline: {
    card: { name: "Clínica Santa Fe", detail: "200 cajas · $ 4.900.000" },
    forecast: "$ 86,5 M",
    appointment: { weekday: "MAR", day: "6", time: "9:00 a. m.", title: "Visita de muestras", who: "Marta · recordatorio 24 h antes ✓" },
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
    summary: "Tienes 9 cotizaciones sin respuesta por $ 38 M y 3 clientes que suelen recomprar este mes. Te propongo retomarlas hoy.",
    chips: ["9 cotizaciones abiertas", "3 recompras esperadas"],
    proposals: [
      { type: "Recuperación", title: "Retomar 9 cotizaciones sin respuesta", meta: "Solo mensaje · sin descuento", status: "Por decidir" },
      { type: "Recompra", title: "Recordar su pedido a 3 clientes recurrentes", meta: "según su historial de compra", status: "Por decidir" },
      { type: "Ritmo de la meta", title: "Con 2 pedidos al día llegas el 30", meta: "según tu historia", status: "Hallazgo" },
    ],
  },
  measure: { steps: [["Conversaciones", "420"], ["Cotizaciones", "186"], ["Pedidos", "64"], ["Pedidos pagados", "58"]], produced: "$ 284 M", quality: Q },
};

export const FILM_CONTENT: Readonly<Record<FilmNiche, FilmContent>> = {
  restaurants: RESTAURANTS,
  tech: TECH,
  beauty: BEAUTY,
  b2b: B2B,
};

/**
 * El cielo del hero: fragmentos de conversaciones reales del producto que
 * suben en matriz de puntos. Cortos (≤ 30 caracteres) para que se lean como
 * mensajes, no como párrafos. Mezclan nichos: son todos los que escriben.
 * Suficientes para que el cielo no repita a la vista (30 a la vez en escritorio).
 */
export const SKY_FRAGMENTS: readonly string[] = [
  "¿Tienen domicilio?",
  "Pedido #2087",
  "Sí, envíalo hoy",
  "¿Hay cita el sábado?",
  "Pago reportado",
  "Te comparto la foto",
  "¿Me cotizas 200?",
  "Me lo llevo",
  "¿Cómo pago?",
  "Cita confirmada",
  "Respondido en 4 s",
  "¿Precio del iPhone 17?",
  "Listo, va en camino",
  "Cotización COT-0318",
  "¿Tienen envío a Cali?",
  "Gracias, llegó perfecto",
  "¿Abren el domingo?",
  "Quedó agendada",
  "Nequi o Bancolombia",
  "¿Me lo apartas?",
  "¿Aceptan Nequi?",
  "Mesa para 4, 8 p. m.",
  "¿Tienen garantía?",
  "Ya transferí",
  "¿Cuánto al por mayor?",
  "Perfecto, gracias",
  "¿Me recuerdas mañana?",
  "Envío gratis desde 150 mil",
  "¿Tienen parqueadero?",
  "Uñas + cejas, ¿cuánto?",
  "Pedido confirmado",
  "¿A qué hora llega?",
  "Quiero 3 cajas",
  "Te paso los datos de pago",
];
