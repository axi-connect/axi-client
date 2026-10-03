import { OUTREACH_BLOCK_REASON_LABELS } from "@/core/lib/outreach-reasons";

import type { Routine } from "./autopilot";

/**
 * Por qué una cuenta salió del recorrido, en palabras. El motor guarda la
 * clave (`items[].reason`) y esta es la única puerta para enseñarla: ninguna
 * clave cruda llega a la pantalla, y lo que no se reconoce se dice como
 * «Se quedó en el camino».
 *
 * Las claves son las del motor de P4: las de calificar (`below_min_score`,
 * `no_decision_maker`, `lead_gone`), las de pasar al CRM (`promote_<código>`),
 * las de la política (`policy_<OutreachBlockReason>`), la del lote
 * (`skipped_in_batch`) y las de inscribir en la secuencia (`enroll_<motivo>`).
 */

type QualifyOf = Pick<Routine, "qualify">;

const UNKNOWN = { label: "Se quedó en el camino", short: "Se quedó en el camino" };

/** La política: el mapa compartido más los que cada módulo nombra a su manera. */
const POLICY: Record<string, { label: string; short: string }> = {
  habeas_data: { label: OUTREACH_BLOCK_REASON_LABELS.habeas_data, short: "Habeas data" },
  suppressed: { label: OUTREACH_BLOCK_REASON_LABELS.suppressed, short: "Lista de supresión" },
  rne: { label: OUTREACH_BLOCK_REASON_LABELS.rne, short: "Registro de Números Excluidos" },
  needs_opt_in: { label: OUTREACH_BLOCK_REASON_LABELS.needs_opt_in, short: "Sin autorización previa" },
  channel_disabled: { label: OUTREACH_BLOCK_REASON_LABELS.channel_disabled, short: "Canal apagado" },
  outside_hours: { label: OUTREACH_BLOCK_REASON_LABELS.outside_hours, short: "Fuera de horario hábil" },
  opted_out: { label: "Se dio de baja: no se le contacta", short: "Se dio de baja" },
  daily_cap: { label: "Se llegó al tope diario de tu política; sale en la siguiente franja", short: "Tope diario" },
  no_identity: { label: "No hay a dónde escribirle por los canales del piloto", short: "Sin dato de contacto" },
  blocked: { label: "Tu política de contacto no lo permite", short: "Tu política" },
};

/** Pasar al CRM: los códigos de `PromoteLeadUseCase` (prospecting). */
const PROMOTE: Record<string, { label: string; short: string }> = {
  "prospecting/lead_not_found": { label: "No pasó al CRM: la cuenta ya no está", short: "Ya no está" },
  "prospecting/lead_not_promotable": {
    label: "No pasó al CRM: ya estaba en el CRM o se descartó",
    short: "Ya estaba o se descartó",
  },
  "prospecting/suppressed": { label: "No pasó al CRM: está en tu lista de no contactar", short: "Lista de no contactar" },
  "prospecting/lead_not_identifiable": {
    label: "No pasó al CRM: no tiene teléfono ni correo",
    short: "Sin teléfono ni correo",
  },
};
const PROMOTE_OTHER = { label: "No pasó al CRM", short: "No pasó al CRM" };

/** Inscribir: los motivos con que la secuencia salta a un contacto. */
const ENROLL: Record<string, { label: string; short: string }> = {
  no_channel: { label: "No hay por dónde escribirle con los canales de la secuencia", short: "Sin canal para la secuencia" },
  opted_out: { label: "Se dio de baja", short: "Se dio de baja" },
  task_open: { label: "Ya va en una secuencia o tiene una tarea abierta", short: "Ya va en otra secuencia" },
  not_enrolled: { label: "La secuencia no lo inscribió (¿está activa?)", short: "La secuencia no lo inscribió" },
};
const ENROLL_OTHER = { label: "No se pudo inscribir en la secuencia", short: "No se pudo inscribir" };

function describe(reason: string, routine?: QualifyOf): { label: string; short: string } {
  switch (reason) {
    case "below_min_score": {
      const min = routine?.qualify.min_score;
      return min === undefined
        ? { label: "Puntaje por debajo del mínimo", short: "Puntaje bajo" }
        : { label: `Puntaje por debajo de ${String(min)}`, short: `Puntaje bajo ${String(min)}` };
    }
    case "no_decision_maker":
      return { label: "No se identificó quién decide", short: "Sin decisor identificado" };
    case "lead_gone":
      return { label: "La cuenta ya no está disponible", short: "Ya no está disponible" };
    case "skipped_in_batch":
      return { label: "La omitiste en el lote", short: "En el lote" };
  }
  if (reason.startsWith("promote_")) return PROMOTE[reason.slice("promote_".length)] ?? PROMOTE_OTHER;
  if (reason.startsWith("policy_")) return POLICY[reason.slice("policy_".length)] ?? POLICY.blocked;
  if (reason.startsWith("enroll_")) return ENROLL[reason.slice("enroll_".length)] ?? ENROLL_OTHER;
  return UNKNOWN;
}

/** «Puntaje por debajo de 60», «Está inscrito en el Registro de Números Excluidos (RNE)». */
export function reasonLabel(reason: string | null, routine?: QualifyOf): string {
  return reason === null || reason === "" ? UNKNOWN.label : describe(reason, routine).label;
}

/** La versión corta, para las salidas del mapa: «Puntaje bajo 60», «En el lote». */
export function reasonShortLabel(reason: string | null, routine?: QualifyOf): string {
  return reason === null || reason === "" ? UNKNOWN.short : describe(reason, routine).short;
}

/** En qué parada del recorrido sale una cuenta con ese motivo (`null` si no se reconoce). */
export function reasonStop(reason: string | null): "qualify" | "promote" | "gate" | "approve" | "contact" | null {
  if (reason === null) return null;
  if (reason === "below_min_score" || reason === "no_decision_maker" || reason === "lead_gone") return "qualify";
  if (reason.startsWith("promote_")) return "promote";
  if (reason.startsWith("policy_")) return "gate";
  if (reason === "skipped_in_batch") return "approve";
  if (reason.startsWith("enroll_")) return "contact";
  return null;
}
