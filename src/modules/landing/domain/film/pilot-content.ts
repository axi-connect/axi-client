/**
 * El piloto automático de captación (plan §19, lienzo aprobado por la dueña el
 * 2026-10-01): los textos de la escena, con el vocabulario de la UI del piloto
 * (`integ/pilot-client`, confirmado por axi-ad el 2026-09-30) palabra por
 * palabra, y las cifras de ejemplo por nicho.
 *
 * El piloto busca EMPRESAS. En los nichos de consumo el Radar muestra leads de
 * anuncios; aquí se cuenta el lado B2B de ese mismo negocio (§19.5).
 *
 * Límites (§19.6): los canales son «Correo · Llamada del agente · SMS» (sin
 * WhatsApp, Instagram ni LinkedIn); no se nombra la Ley 2300 ni se dice que se
 * cumple; no se habla de Apollo ni de créditos; ningún porcentaje de conversión.
 */
import type { FilmNiche } from "./niches";

/** El interruptor de la escena (§19, D11): apagada hasta que el piloto esté en producción. */
export const FILM_FEATURES = { pilot: false } as const;

/** Las etapas de una cuenta, como las nombra la UI del piloto. */
export const PILOT_STAGES = {
  searching: "Buscando",
  enriching: "Completando datos",
  qualifying: "Calificando",
  contacting: "Contactando",
  following: "En seguimiento",
  replied: "Respondió",
  demo: "Demo agendada",
  discarded: "Descartado",
} as const;

export type PilotStage = keyof typeof PILOT_STAGES;

/** El estado de la ejecución. «Lista para despegar» es el antes del lienzo; los testigos son los otros tres. */
export const PILOT_STATUS = {
  ready: "Lista para despegar",
  running: "En ejecución",
  waiting: "Espera tu aprobación",
  done: "Terminada",
} as const;

export type PilotStatus = keyof typeof PILOT_STATUS;

/** Los testigos de la cabina, en orden. */
export const PILOT_ANNUNCIATORS: readonly Exclude<PilotStatus, "ready">[] = ["running", "waiting", "done"];

export const PILOT_COPY = {
  eyebrow: "Captar · Piloto automático",
  title: ["Pon tu captación en", "piloto automático."],
  lead: "Tú eliges cómo vuela: Asistido, apruebas cada lote; Autónomo, siempre dentro de tu política y tus topes.",
  /** Plan del piloto §7. */
  principle: "«Si no aumenta la relevancia, la confianza o la claridad, no se envía.»",
  /** Los seis pasos: en la carta, en mayúsculas espaciadas (CSS); en la pantalla de ruta, tal cual. */
  steps: ["Buscar", "Completar datos", "Calificar y revelar", "Pasar al CRM", "Revisar la política", "Inscribir en la secuencia"],
  destination: "Demo agendada",
  tower: "Torre · Radar",
  sources: ["Google Maps", "RUES abierto", "Buscador web"],
  people: { title: "Personas de este negocio", roles: "quién decide · quién recomienda · quién usa" },
  zone: { title: "Lo que se respeta siempre", near: "Fuera de horario hábil", passed: "Bajas · lista de supresión · Registro de Números Excluidos" },
  hold: "En espera · tu aprobación",
  bubble: { title: "Correo · primer mensaje", text: "«Tu empresa aparece en información pública de negocios.»" },
  cockpit: {
    title: "Ejecución del piloto",
    modes: ["Asistido", "Autónomo"],
    modeLabel: "Modo del piloto",
    modeNote: "Te pide aprobar el lote antes de escribirle a nadie.",
    dials: ["Encontró", "Calificó", "Contactó"],
    step: (n: number, total: number) => `Paso ${n} de ${total}`,
    next: "Siguiente",
    cap: "Dentro del tope",
    capUnit: "hoy",
    board: "Cuentas por etapa",
    log: "Bitácora",
    lotTitle: "El lote espera tu aprobación",
    approveOne: (account: string) => `Aprobar ${account}`,
    approve: (n: number) => `Aprobar ${n} y contactar`,
    skipped: (m: number) => `${m} se omiten`,
    runNow: "Ejecutar ahora",
    runNowWhy: "espera tu aprobación del lote",
    sent: (n: number) => `Lote aprobado · ${n} cuentas en contacto`,
    channels: ["Correo", "Llamada del agente", "SMS"],
    foot: "Ver en vivo · Bitácora de la ejecución",
  },
  /** La bitácora mientras vuela (antes de la espera). */
  log: [
    "Despegó desde la torre con la cuenta del radar",
    "Buscó en Google Maps, RUES abierto y buscador web",
    "Calificó y reveló quién decide",
    "Pasó las cuentas al CRM",
  ],
  results: {
    title: "Lo que trajeron los pilotos · octubre",
    sample: "Cifras de ejemplo",
    funnel: "Embudo del mes",
    stages: ["Encontradas", "Calificadas", "Contactadas", "Respondieron", "Demos"],
    tuneTitle: "Ajuste del piloto",
    tuneNote: "Con los números de tus pilotos, sin inventar nada.",
    tuneChange: "Qué cambia si lo aplicas ·",
    tuneWhat: "Horario",
  },
} as const;

export type PilotNicheContent = {
  /** Lo que busca el piloto en este negocio (§19.5). */
  target: string;
  /** Las cinco cuentas del tablero, en orden. Nombres genéricos: ninguno coincide con una empresa real (salvo los del Radar aprobado). */
  accounts: readonly [string, string, string, string, string];
  /** Cuáles van marcadas en el lote. La que no, se omite y termina en «Descartado». */
  lot: readonly [boolean, boolean, boolean, boolean, boolean];
  /** Quién decide en la primera cuenta (fijo 3). */
  decisor: { initials: string; name: string; role: string };
  /** La ejecución del día: lo que muestran los relojes y el tope. */
  run: { found: number; qualified: number; cap: number };
  /** El embudo del mes de la ficha, en el orden de `PILOT_COPY.results.stages`. Solo conteos. */
  funnel: readonly [number, number, number, number, number];
};

const RUN = { found: 25, qualified: 9, cap: 40 } as const;
const FUNNEL = [120, 46, 32, 11, 4] as const;
const LOT = [true, true, true, true, false] as const;

export const PILOT_CONTENT: Readonly<Record<FilmNiche, PilotNicheContent>> = {
  restaurants: {
    target: "Empresas cercanas para almuerzos corporativos",
    accounts: ["Grupo Sol", "Seguros del Parque", "Notaría 21", "Constructora Norte", "Oficinas Calle 93"],
    lot: LOT,
    // Andrea Ruiz es la de los «30 almuerzos confirmados» de la llamada.
    decisor: { initials: "AR", name: "Andrea Ruiz", role: "Jefa administrativa · decide" },
    run: RUN,
    funnel: FUNNEL,
  },
  tech: {
    target: "Empresas que renuevan equipos",
    accounts: ["Contadores del Centro", "Logística del Sur", "Inmobiliaria Los Robles", "Estudio de Diseño 45", "Abogados Calle 10"],
    lot: LOT,
    decisor: { initials: "CM", name: "Carolina Mejía", role: "Gerente administrativa · decide" },
    run: RUN,
    funnel: FUNNEL,
  },
  beauty: {
    target: "Empresas con plan de bienestar para su equipo",
    accounts: ["Transportes del Valle", "Editorial Brisa", "Contact Center del Norte", "Fondo de Empleados Calle 80", "Distribuidora La Esquina"],
    lot: LOT,
    decisor: { initials: "JT", name: "Juliana Torres", role: "Directora de talento humano · decide" },
    run: RUN,
    funnel: FUNNEL,
  },
  b2b: {
    target: "Tu cliente ideal",
    accounts: ["Clínica Santa Fe", "Consultorio Dental Norte", "Laboratorio del Parque", "Centro Médico 93", "Fisioterapia Calle 50"],
    lot: LOT,
    // El decisor del Radar en B2B.
    decisor: { initials: "MR", name: "Marta Restrepo", role: "Directora de compras · decide" },
    run: RUN,
    funnel: FUNNEL,
  },
};

/** N y M del lote: salen de las casillas, nunca se escriben a mano (§19.3). */
export function lotCounts(lot: readonly boolean[]): { approved: number; skipped: number } {
  const approved = lot.filter(Boolean).length;
  return { approved, skipped: lot.length - approved };
}
