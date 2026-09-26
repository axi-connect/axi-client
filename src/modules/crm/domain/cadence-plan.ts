import type { JourneyStageDTO, JourneySwitches } from "./journey";

/**
 * La cadencia de una etapa contada como lo que hará el agente (lienzo CRM
 * premium F4 · Recorrido). Puro: la isla solo pinta.
 *
 * Fiel al motor (`agent_tasks.service`): cada intento espera `wait_hours` la
 * respuesta antes del siguiente —la cadencia de la etapa SUSTITUYE a la
 * espera general—, y al agotar los intentos aplica `exhausted_action`. Los
 * días son de calendario puro: el horario silencioso y los topes diarios
 * pueden correr un intento, y la isla lo dice en su pie.
 */
export type CadenceMark = { at: string; title: string; detail: string };
export type CadencePlan = {
  headline: string;
  attempts: CadenceMark[];
  outcome: CadenceMark & { tone: "destructive" | "neutral" | "warning" };
};

/** «Día 0», «+4 h», «Día 2»: días enteros como día; el resto en horas. */
export function cadenceAt(hours: number): string {
  if (hours === 0) return "Día 0";
  return hours % 24 === 0 ? `Día ${String(hours / 24)}` : `+${String(hours)} h`;
}

function spanLabel(hours: number): string {
  if (hours < 24 || hours % 24 !== 0) return `${String(hours)} h`;
  const days = hours / 24;
  return days === 1 ? "1 día" : `${String(days)} días`;
}

const VERB = {
  message: { one: "Escribe una vez", many: (n: number) => `Escribe ${String(n)} veces`, mark: "Mensaje" },
  call: { one: "Llama una vez", many: (n: number) => `Llama ${String(n)} veces`, mark: "Llamada" },
  call_then_message: {
    one: "Llama una vez (si no contesta, escribe)",
    many: (n: number) => `Llama ${String(n)} veces (si no contesta, escribe)`,
    mark: "Llamada y luego mensaje",
  },
} as const;

const OUTCOME = {
  mark_lost: {
    title: "Al agotarse: marcar perdida",
    detail: "La oportunidad se cierra como perdida por cadencia agotada.",
    tone: "destructive",
  },
  let_cool: {
    title: "Al agotarse: dejar enfriar",
    detail: "Se queda en la etapa y el agente deja de insistir; te llega el aviso.",
    tone: "neutral",
  },
  hand_to_human: {
    title: "Al agotarse: pasar a una persona",
    detail: "Se crea una tarea para quien lleva la oportunidad.",
    tone: "warning",
  },
} as const;

export function cadencePlan(
  stage: Pick<JourneyStageDTO, "cadence" | "auto_advance" | "stage_kind">,
  switches: JourneySwitches,
): CadencePlan | null {
  const cadence = stage.cadence;
  if (cadence === null) return null;
  const verb = VERB[cadence.channel];
  const n = cadence.max_attempts;
  const wait = cadence.wait_hours;
  const movesAlone = stage.auto_advance && stage.stage_kind !== "custom" && switches.rules;

  const head = n === 1 ? `${verb.one} y espera ${spanLabel(wait)} la respuesta` : `${verb.many(n)} en ${spanLabel(n * wait)}`;
  const attempts = Array.from({ length: n }, (_, index) => ({
    at: cadenceAt(index * wait),
    title: `Intento ${String(index + 1)} · ${verb.mark}`,
    detail:
      index === 0
        ? `Abre la conversación y espera ${spanLabel(wait)} la respuesta.`
        : "Si no hubo respuesta, vuelve a intentarlo.",
  }));
  const outcome = OUTCOME[cadence.exhausted_action];
  return {
    headline: `${head}${movesAlone ? " y la mueve sola si avanza." : "."}`,
    attempts,
    outcome: { at: cadenceAt(n * wait), title: outcome.title, detail: outcome.detail, tone: outcome.tone },
  };
}
