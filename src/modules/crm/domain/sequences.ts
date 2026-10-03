import type { Schemas } from "@/core/api/types";
import type { FollowUpMedium } from "@/modules/crm/domain/schedule-follow-up";
import type { CrmCallType } from "@/modules/calls/public";

export type SequenceDTO = Schemas["SequenceDto"];
export type SequenceStepDTO = SequenceDTO["steps"][number];
export type UpsertSequenceDTO = Schemas["UpsertSequenceDto"];
export type EnrollmentDTO = Schemas["EnrollmentsListDto"]["data"][number];
export type EnrollmentStopReason = NonNullable<EnrollmentDTO["stop_reason"]>;

/** Espejo de los CHECK de la tabla: el editor impone lo mismo antes de enviar. */
export const SEQUENCE_LIMITS = {
  /** P3b-2: 12, para la pista de relación (un toque al mes durante un año). */
  steps: { min: 1, max: 12 },
  /** 365 días (P3b-2): la relación dura un año; el ancla es la inscripción. */
  offset_hours: { min: 0, max: 8760 },
} as const;

export const ENROLLMENT_STATUS_MAP = {
  active: { label: "Activa", tone: "info" as const },
  // P3b: «ahora no» la duerme sin cerrarla: sigue `active` en el servidor.
  snoozed: { label: "Dormida", tone: "neutral" as const },
  completed: { label: "Completada", tone: "neutral" as const },
  stopped: { label: "Parada", tone: "success" as const },
};

/** El estado que se enseña: una activa dormida por «ahora no» se dice «Dormida». */
export function enrollmentDisplayStatus(enrollment: {
  status: EnrollmentDTO["status"];
  snoozed_until: string | null;
}): keyof typeof ENROLLMENT_STATUS_MAP {
  return enrollment.status === "active" && enrollment.snoozed_until !== null ? "snoozed" : enrollment.status;
}

/**
 * Por qué se paró. Las dos primeras son ÉXITOS, y la copia lo dice: una
 * secuencia que para porque el cliente contestó hizo exactamente su trabajo.
 */
export const STOP_REASON_LABELS: Record<EnrollmentStopReason, string> = {
  replied: "Respondió",
  converted: "Compró",
  opted_out: "Se dio de baja",
  task_cancelled: "El paso no pudo salir",
  stopped_by_user: "La paró alguien del equipo",
  // P3b: contestó que no le interesa. No se insiste.
  not_interested: "No le interesa",
};

/**
 * P3a: además de mensaje y llamada, una secuencia escribe correo, manda SMS o
 * deja una tarea manual (Instagram, LinkedIn, una visita). El correo y el SMS
 * salen de un texto fijo con huecos, nunca del agente.
 */
export type SequenceMedium = FollowUpMedium | "email" | "sms" | "manual";

/** Medios cuyo texto se escribe en el paso. */
export const TEMPLATED_SEQUENCE_MEDIA: readonly SequenceMedium[] = ["email", "sms", "manual"];

/** Espejo de los límites del servidor (outreach `message_template`). */
export const MESSAGE_LIMITS = { subject: 150, body: 5_000, sms_body: 600 } as const;

/** Los huecos que el texto admite (espejo de outreach `MESSAGE_TEMPLATE_PLACEHOLDERS`). */
export const MESSAGE_VARIABLES = ["first_name", "business_name", "job_title", "sender_name"] as const;
export type MessageVariable = (typeof MESSAGE_VARIABLES)[number];
export const MESSAGE_VARIABLE_LABELS: Record<MessageVariable, string> = {
  first_name: "Nombre",
  business_name: "Su empresa",
  job_title: "Su cargo",
  sender_name: "Tu negocio",
};

/** Un paso en el editor, antes de tener id. */
export type DraftStep = {
  offset_hours: number;
  task_channel: SequenceMedium;
  /** Plan de modos §7: el marco de la llamada del paso; solo si el medio llama. */
  call_type?: CrmCallType;
  objective: string;
  /** Solo correo. */
  subject?: string;
  /** Correo y SMS: el texto; manual: el texto listo para copiar (opcional). */
  body?: string;
};

/** Segmentos de SMS que se cobran: 160 caracteres, o 70 si hay tildes o emoji. */
export function smsSegments(text: string): number {
  if (text.length === 0) return 0;
  const gsm = /^[\x00-\x7F]*$/.test(text);
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  return text.length <= single ? 1 : Math.ceil(text.length / multi);
}

/** Tres puntos de partida, ya redactados: una secuencia en blanco es la
 *  pantalla donde la gente abandona. */
export const SEQUENCE_TEMPLATES: readonly {
  key: string;
  name: string;
  description: string;
  steps: DraftStep[];
}[] = [
  {
    key: "post_capture",
    name: "Post-captación",
    description: "Para leads recién promovidos: presentarse, entender qué necesita y ofrecer cita.",
    steps: [
      { offset_hours: 0, task_channel: "message", objective: "Presentarnos y preguntar qué necesita" },
      { offset_hours: 48, task_channel: "call", objective: "Resolver dudas por voz y ofrecer una cita" },
      { offset_hours: 120, task_channel: "message", objective: "Último intento: proponer una cita concreta" },
    ],
  },
  {
    key: "post_import",
    name: "Post-import",
    description: "Para una lista que entra de golpe: abrir y retomar a los tres días.",
    steps: [
      { offset_hours: 0, task_channel: "message", objective: "Presentarnos y explicar en qué podemos ayudar" },
      { offset_hours: 72, task_channel: "message", objective: "Retomar y preguntar si le interesa una cita" },
    ],
  },
  {
    key: "radar_b2b",
    name: "Radar B2B · 14 días · 8 toques",
    description:
      "Para empresas que aún no te conocen: correo con un dato de su negocio, LinkedIn, llamada y SMS, sin insistir de más.",
    steps: [
      {
        offset_hours: 0,
        task_channel: "email",
        objective: "Presentarnos con un dato concreto de su negocio",
        subject: "Una idea para {{business_name}}",
        body:
          "Hola {{first_name}}:\n\nAyudamos a negocios como {{business_name}} a responder a sus clientes por WhatsApp en segundos, también fuera de horario.\n\n¿Te sirve que te muestre en 15 minutos cómo se vería en tu negocio?\n\n{{sender_name}}",
      },
      {
        offset_hours: 24,
        task_channel: "manual",
        objective: "Conectar por LinkedIn con una nota corta",
        body: "Hola {{first_name}}, te escribí por correo sobre {{business_name}}. Me gustaría conectar por aquí.",
      },
      { offset_hours: 72, task_channel: "call", objective: "Llamar para saber si vio el correo y ofrecer la demo" },
      {
        offset_hours: 120,
        task_channel: "email",
        objective: "Hacer una pregunta sobre cómo atienden hoy",
        subject: "Una pregunta rápida sobre {{business_name}}",
        body:
          "Hola {{first_name}}:\n\n¿Cuánto tardan hoy en contestar un WhatsApp de un cliente nuevo? Si te sirve, te muestro en 15 minutos cómo se vería contestar en segundos en {{business_name}}.\n\n{{sender_name}}",
      },
      {
        offset_hours: 168,
        task_channel: "manual",
        objective: "Comentar o escribir por Instagram si el negocio lo usa",
        body: "Hola, soy de {{sender_name}}. Les escribí por correo con una idea para {{business_name}}; ¿a quién le puedo contar?",
      },
      { offset_hours: 216, task_channel: "call", objective: "Segunda llamada: resolver la duda que frena la decisión" },
      {
        offset_hours: 264,
        task_channel: "sms",
        objective: "Recordatorio breve con la propuesta de cita",
        body: "Hola {{first_name}}, soy de {{sender_name}}. ¿Te sirve una llamada de 15 min esta semana para ver la idea para {{business_name}}?",
      },
      {
        offset_hours: 336,
        task_channel: "email",
        objective: "Cerrar con elegancia y dejar la puerta abierta",
        subject: "¿Lo dejamos para más adelante?",
        body:
          "Hola {{first_name}}:\n\nNo quiero llenarte el correo. Si ahora no es el momento, lo entiendo; te escribo en unos meses. Si te interesa antes, solo responde este correo.\n\n{{sender_name}}",
      },
    ],
  },
  {
    key: "reactivation",
    name: "Reactivación de fríos",
    description: "Para clientes que llevan meses sin comprar: recordar, escuchar y llamar.",
    steps: [
      { offset_hours: 0, task_channel: "message", objective: "Retomar el contacto y preguntar cómo le fue" },
      { offset_hours: 96, task_channel: "message", objective: "Contarle la novedad que más encaje con lo suyo" },
      {
        offset_hours: 240,
        task_channel: "call_then_message",
        call_type: "reactivation",
        objective: "Llamar para cerrar o despedirse con elegancia",
      },
    ],
  },
  {
    key: "relationship",
    name: "Relación · 12 meses · un toque al mes",
    description:
      "Para quien terminó la persecución sin responder: un toque de valor al mes, alternando canal. Se para sola si responde. Completa los corchetes con lo tuyo.",
    steps: [
      {
        offset_hours: 720,
        task_channel: "email",
        objective: "Una idea práctica para el trimestre, sin vender",
        subject: "Una idea para este trimestre, {{first_name}}",
        body: "Hola {{first_name}}:\n\n[Comparte aquí un dato o una idea útil para negocios como {{business_name}}. Sin pedir nada a cambio.]\n\n{{sender_name}}",
      },
      { offset_hours: 1440, task_channel: "manual", objective: "Felicitar por un logro o una novedad suya", body: "Hola {{first_name}}, vi [la novedad]. ¡Felicitaciones! [Una línea propia.]" },
      {
        offset_hours: 2160,
        task_channel: "email",
        objective: "Contar otro caso, de otro problema distinto",
        subject: "Otro caso que quizá te suene",
        body: "Hola {{first_name}}:\n\n[Cuenta un caso REAL de un cliente tuyo, con su permiso: qué problema tenía y qué cambió.]\n\n{{sender_name}}",
      },
      { offset_hours: 2880, task_channel: "sms", objective: "Una pregunta corta sobre su temporada", body: "Hola {{first_name}}, soy de {{sender_name}}. ¿Cómo viene [temporada] para {{business_name}}?" },
      {
        offset_hours: 3600,
        task_channel: "email",
        objective: "Un aprendizaje del año que le sirva, sin vender",
        subject: "Para cerrar el año, {{first_name}}",
        body: "Hola {{first_name}}:\n\n[Comparte aquí un dato o una idea útil para negocios como {{business_name}}. Sin pedir nada a cambio.]\n\n{{sender_name}}",
      },
      { offset_hours: 4320, task_channel: "manual", objective: "Recomendar algo útil sin relación con vender", body: "Hola {{first_name}}, me acordé de ustedes con [recurso o contacto útil]. [Por qué les sirve.]" },
      {
        offset_hours: 5040,
        task_channel: "email",
        objective: "Contar qué cambió para un cliente en un año",
        subject: "Un año después, en un negocio como {{business_name}}",
        body: "Hola {{first_name}}:\n\n[Cuenta un caso REAL de un cliente tuyo, con su permiso: qué problema tenía y qué cambió.]\n\n{{sender_name}}",
      },
      { offset_hours: 5760, task_channel: "sms", objective: "Un saludo de cierre de año, sin pedir nada", body: "Hola {{first_name}}, soy de {{sender_name}}. Que cierren bien el año en {{business_name}}. [Una línea propia.]" },
      {
        offset_hours: 6480,
        task_channel: "email",
        objective: "Compartir algo útil de su sector, sin vender",
        subject: "Algo que te puede servir, {{first_name}}",
        body: "Hola {{first_name}}:\n\n[Comparte aquí un dato o una idea útil para negocios como {{business_name}}. Sin pedir nada a cambio.]\n\n{{sender_name}}",
      },
      { offset_hours: 7200, task_channel: "manual", objective: "Comentar o reaccionar a algo que publicaron", body: "Hola {{first_name}}, vi lo que publicaron sobre [tema]. [Un comentario corto y sincero.]" },
      {
        offset_hours: 7920,
        task_channel: "email",
        objective: "Contar un caso de un negocio parecido",
        subject: "Cómo lo resolvió un negocio como {{business_name}}",
        body: "Hola {{first_name}}:\n\n[Cuenta un caso REAL de un cliente tuyo, con su permiso: qué problema tenía y qué cambió.]\n\n{{sender_name}}",
      },
      { offset_hours: 8640, task_channel: "sms", objective: "Saludo breve y una pregunta abierta", body: "Hola {{first_name}}, soy de {{sender_name}}. ¿Cómo les va con [tema] este mes?" },
    ],
  },
];

const HOUR_MS = 3_600_000;
const DAY_HOURS = 24;

/** «+2 días», «+6 h», «al inscribir» — cómo lee el operador una espera. */
export function offsetLabel(hours: number): string {
  if (hours === 0) return "Al inscribir";
  if (hours < DAY_HOURS) return `+${String(hours)} h`;
  const days = Math.round(hours / DAY_HOURS);
  // P3b-2: la pista de relación se cuenta en meses («+11 meses», no «+330 días»).
  if (days >= 60 && days % 30 === 0) return `+${String(days / 30)} meses`;
  return `+${String(days)} ${days === 1 ? "día" : "días"}`;
}

/** Cuándo recibiría el último paso quien se inscriba AHORA. */
export function lastStepAt(steps: readonly { offset_hours: number }[], from: Date): Date | null {
  if (steps.length === 0) return null;
  const max = Math.max(...steps.map((step) => step.offset_hours));
  return new Date(from.getTime() + max * HOUR_MS);
}

export type SequenceProblem = { index: number | null; message: string };

/**
 * Qué impide guardar. Se valida por PASO y no solo el conjunto, porque el
 * editor tiene que poder señalar cuál está mal — decir «hay un error» sobre
 * una lista de ocho pasos es no decir nada.
 */
export function validateSequence(input: {
  name: string;
  steps: readonly DraftStep[];
}): SequenceProblem[] {
  const problems: SequenceProblem[] = [];
  if (input.name.trim().length < 2) {
    problems.push({ index: null, message: "Ponle un nombre a la secuencia" });
  }
  if (input.steps.length < SEQUENCE_LIMITS.steps.min) {
    problems.push({ index: null, message: "Una secuencia necesita al menos un paso" });
  }
  if (input.steps.length > SEQUENCE_LIMITS.steps.max) {
    problems.push({
      index: null,
      message: `Máximo ${String(SEQUENCE_LIMITS.steps.max)} pasos: un toque al mes durante un año`,
    });
  }
  input.steps.forEach((step, index) => {
    if (step.objective.trim().length < 10) {
      problems.push({ index, message: "El objetivo es demasiado corto para que el agente lo cumpla" });
    }
    if (
      !Number.isInteger(step.offset_hours) ||
      step.offset_hours < SEQUENCE_LIMITS.offset_hours.min ||
      step.offset_hours > SEQUENCE_LIMITS.offset_hours.max
    ) {
      problems.push({ index, message: "La espera va entre 0 h y 365 días" });
    }
    if (step.task_channel === "email") {
      if ((step.subject ?? "").trim().length === 0) problems.push({ index, message: "El correo necesita un asunto" });
      if ((step.body ?? "").trim().length === 0) problems.push({ index, message: "El correo necesita un texto" });
    }
    if (step.task_channel === "sms") {
      const body = (step.body ?? "").trim();
      if (body.length === 0) problems.push({ index, message: "El SMS necesita un texto" });
      if (body.length > MESSAGE_LIMITS.sms_body) {
        problems.push({ index, message: `Un SMS de secuencia tiene como mucho ${String(MESSAGE_LIMITS.sms_body)} caracteres` });
      }
    }
    // P3b-2: las plantillas dejan huecos «[…]» para que el negocio ponga lo
    // suyo. Uno sin completar le llegaría tal cual a un cliente real. La tarea
    // manual no: la hace una persona que lo lee.
    if ((step.task_channel === "email" || step.task_channel === "sms") && hasUnfilledBracket(`${step.subject ?? ""} ${step.body ?? ""}`)) {
      problems.push({ index, message: "Completa el texto entre corchetes antes de guardar" });
    }
    // Las esperas se miden desde la INSCRIPCIÓN: si no crecen, dos pasos caen
    // a la vez y el cliente recibe dos mensajes seguidos.
    const previous = input.steps[index - 1];
    if (previous !== undefined && step.offset_hours <= previous.offset_hours) {
      problems.push({ index, message: "Este paso debe esperar más que el anterior" });
    }
  });
  return problems;
}

/** Un hueco de plantilla sin completar: «[tema]», «[Cuenta aquí…]». Espejo del servidor. */
export function hasUnfilledBracket(text: string): boolean {
  return /\[[^\]\n]{2,}\]/.test(text);
}

/** Las esperas viajan tal cual; el orden de la lista ES la posición. */
export function toUpsertDTO(input: {
  name: string;
  description: string;
  stop_on_reply: boolean;
  stop_on_conversion: boolean;
  is_active: boolean;
  /** P3b-2: SIEMPRE viaja (null incluido): guardar sin él borraría el encadenado. */
  next_sequence_id: string | null;
  steps: readonly DraftStep[];
}): UpsertSequenceDTO {
  return {
    name: input.name.trim(),
    description: input.description.trim() === "" ? null : input.description.trim(),
    stop_on_reply: input.stop_on_reply,
    stop_on_conversion: input.stop_on_conversion,
    is_active: input.is_active,
    next_sequence_id: input.next_sequence_id,
    steps: input.steps.map((step) => ({
      offset_hours: step.offset_hours,
      task_channel: step.task_channel,
      // Solo los pasos que llaman llevan marco: un correo, un SMS o una tarea
      // manual con call_type dejarían un dato sucio en el paso y la actividad.
      ...(step.task_channel === "call" || step.task_channel === "call_then_message"
        ? { call_type: step.call_type ?? "followup" }
        : {}),
      objective: step.objective.trim(),
      message_template: messageTemplateOf(step),
    })),
  };
}

/** El texto del paso, solo donde aplica (correo, SMS o el texto listo de la manual). */
export function messageTemplateOf(step: DraftStep): { subject: string | null; body: string } | null {
  if (!TEMPLATED_SEQUENCE_MEDIA.includes(step.task_channel)) return null;
  const body = (step.body ?? "").trim();
  if (body.length === 0) return null;
  const subject = step.task_channel === "email" ? (step.subject ?? "").trim() : "";
  return { subject: subject.length === 0 ? null : subject, body };
}

/**
 * «Así lo vive el contacto» (lienzo CRM premium F4 · editar secuencia): la
 * secuencia contada desde el otro lado, con las fechas de quien se inscriba
 * en `from`. Solo la fecha: la hora la pone el horario de trabajo del motor.
 */
export function sequenceStory(
  input: { steps: readonly DraftStep[]; stop_on_reply: boolean },
  from: Date,
): { headline: string; days: { when: string; channel: DraftStep["task_channel"]; objective: string }[] } | null {
  if (input.steps.length === 0) return null;
  const steps = [...input.steps].sort((a, b) => a.offset_hours - b.offset_hours);
  const span = steps[steps.length - 1].offset_hours;
  const spanText =
    span < DAY_HOURS
      ? `${String(span)} h`
      : `${String(Math.round(span / DAY_HOURS))} ${Math.round(span / DAY_HOURS) === 1 ? "día" : "días"}`;
  const count = steps.length === 1 ? "Un paso" : `${String(steps.length)} pasos en ${spanText}`;
  const stop = input.stop_on_reply ? "Si responde en cualquiera, se detiene y el agente conversa." : "Sigue aunque responda.";
  return {
    headline: `${count}. ${stop}`,
    days: steps.map((step) => ({
      when: new Date(from.getTime() + step.offset_hours * HOUR_MS).toLocaleDateString("es-CO", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      channel: step.task_channel,
      objective: step.objective.trim(),
    })),
  };
}
