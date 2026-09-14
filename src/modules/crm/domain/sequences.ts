import type { Schemas } from "@/core/api/types";
import type { FollowUpMedium } from "@/modules/crm/domain/schedule-follow-up";

export type SequenceDTO = Schemas["SequenceDto"];
export type SequenceStepDTO = SequenceDTO["steps"][number];
export type UpsertSequenceDTO = Schemas["UpsertSequenceDto"];
export type EnrollmentDTO = Schemas["EnrollmentsListDto"]["data"][number];
export type EnrollmentStopReason = NonNullable<EnrollmentDTO["stop_reason"]>;

/** Espejo de los CHECK de la tabla: el editor impone lo mismo antes de enviar. */
export const SEQUENCE_LIMITS = {
  steps: { min: 1, max: 8 },
  /** 90 días. Más allá, lo que haya que decirle al cliente ya no es esto. */
  offset_hours: { min: 0, max: 2160 },
} as const;

export const ENROLLMENT_STATUS_MAP = {
  active: { label: "Activa", tone: "info" as const },
  completed: { label: "Completada", tone: "neutral" as const },
  stopped: { label: "Parada", tone: "success" as const },
};

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
};

/** Un paso en el editor, antes de tener id. */
export type DraftStep = {
  offset_hours: number;
  task_channel: FollowUpMedium;
  objective: string;
};

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
    key: "reactivation",
    name: "Reactivación de fríos",
    description: "Para clientes que llevan meses sin comprar: recordar, escuchar y llamar.",
    steps: [
      { offset_hours: 0, task_channel: "message", objective: "Retomar el contacto y preguntar cómo le fue" },
      { offset_hours: 96, task_channel: "message", objective: "Contarle la novedad que más encaje con lo suyo" },
      { offset_hours: 240, task_channel: "call_then_message", objective: "Llamar para cerrar o despedirse con elegancia" },
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
      message: `Máximo ${String(SEQUENCE_LIMITS.steps.max)} pasos: más que eso es una campaña de goteo`,
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
      problems.push({ index, message: "La espera va entre 0 h y 90 días" });
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

/** Las esperas viajan tal cual; el orden de la lista ES la posición. */
export function toUpsertDTO(input: {
  name: string;
  description: string;
  stop_on_reply: boolean;
  stop_on_conversion: boolean;
  is_active: boolean;
  steps: readonly DraftStep[];
}): UpsertSequenceDTO {
  return {
    name: input.name.trim(),
    description: input.description.trim() === "" ? null : input.description.trim(),
    stop_on_reply: input.stop_on_reply,
    stop_on_conversion: input.stop_on_conversion,
    is_active: input.is_active,
    steps: input.steps.map((step) => ({
      offset_hours: step.offset_hours,
      task_channel: step.task_channel,
      objective: step.objective.trim(),
    })),
  };
}
