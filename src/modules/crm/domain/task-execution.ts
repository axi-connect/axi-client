import type { Schemas } from "@/core/api/types";
import type { StatusMap, StatusTone } from "@/shared/components/features/status-badge/types";

import type { ActivityDTO } from "./activity";

/**
 * Ejecución de tareas de agente: etiquetas, tonos y las tres funciones puras
 * que deciden cómo se pinta una fila. TypeScript puro — cero React, cero http.
 *
 * Existe porque el estado de una tarea tiene DOS dimensiones y mezclarlas en la
 * UI produce filas que se contradicen: `task_status` es el ciclo de vida
 * (abierta/completada/cancelada) y `last_run_status` es el desenlace del último
 * intento del motor. Una tarea `open` con último intento `deferred` está
 * abierta Y en espera a la vez, y eso hay que decirlo sin que parezca un fallo.
 */

export type TaskAssigneeType = NonNullable<ActivityDTO["assignee_type"]>;
export type TaskTrigger = ActivityDTO["trigger"];
export type TaskRunStatus = NonNullable<ActivityDTO["last_run_status"]>;
/** El spec no nombra el DTO suelto: se deriva del listado, que sí es un componente. */
export type TaskRunDTO = Schemas["TaskRunsListDto"]["data"][number];

/** El tono se REEXPORTA del componente en vez de redeclararse: `types.ts` no
 *  tiene React justamente para que el `domain/` pueda depender de él. */
export type { StatusTone };

export const TASK_RUN_STATUS_LABELS: Record<TaskRunStatus, string> = {
  scheduled: "Programada",
  running: "Enviando",
  done: "Enviada",
  deferred: "En espera",
  failed: "No se pudo enviar",
  cancelled: "Cancelada",
  skipped: "Omitida",
};

/**
 * `deferred` va en **info**, nunca en warning ni destructive.
 *
 * Un diferimiento es operación normal —la ventana de 24 h de WhatsApp se cierra
 * sola—, y un tenant que vea rojo cada vez que eso pasa desactiva la
 * automatización. `info` es el tono del sistema para "neutro pero activo".
 */
export const TASK_RUN_STATUS_TONES: Record<TaskRunStatus, StatusTone> = {
  scheduled: "info",
  running: "info",
  done: "success",
  deferred: "info",
  failed: "destructive",
  cancelled: "neutral",
  skipped: "neutral",
};

/** Solo `running` muestra spinner dentro del badge (`StatusBadge transient`). */
export function isTransientRunStatus(status: TaskRunStatus): boolean {
  return status === "running";
}

/**
 * Razones de diferimiento/fallo. `Partial` a propósito: el backend las declara
 * como string libre para poder añadir razones sin migración, así que el panel
 * traduce lo que conoce y muestra el crudo cuando no — nunca se queda en blanco.
 */
export const TASK_RUN_REASON_LABELS: Partial<Record<string, string>> = {
  outside_service_window: "Fuera de la ventana de 24 h de WhatsApp",
  no_channel: "El contacto no tiene ningún canal alcanzable",
  channel_not_found: "El canal ya no existe",
  channel_not_connected: "El canal está desconectado",
  no_contact_identity: "El contacto no tiene identidad en ese canal",
  unsupported_channel_kind: "Instagram y Messenger todavía no envían estas tareas",
  unsupported_content: "El contenido no viaja por ese canal",
  company_suspended: "Cuenta suspendida: no salen mensajes",
  limit_exceeded: "Se agotó el cupo de mensajes del plan",
  contact_not_found: "El contacto ya no existe",
  conversation_not_found: "La conversación ya no existe",
  quiet_hours: "Fuera del horario permitido para escribir",
  daily_cap: "Se alcanzó el tope diario de tareas automáticas",
  contact_cooldown: "Ya se le escribió hace poco",
  wweb_throttled: "El canal de WhatsApp Web no tuvo cupo (límite anti-bloqueo)",
  conversation_human_active: "Un asesor está atendiendo la conversación",
  agent_paused: "El agente está pausado",
  agent_error: "El agente no pudo completar el turno",
  agent_empty_reply: "El agente no produjo ningún mensaje",
  opted_out: "El contacto pidió no recibir mensajes",
  precondition_gone: "Ya no aplica: la situación cambió",
  task_cancelled: "La tarea se canceló",
  expired: "Se agotaron los intentos",
  internal_error: "Error interno; se reintenta solo",
};

export function taskRunReasonLabel(reason: string | null): string | null {
  if (reason === null || reason.length === 0) return null;
  return TASK_RUN_REASON_LABELS[reason] ?? reason;
}

export const TASK_TRIGGER_LABELS: Record<TaskTrigger, string> = {
  manual: "Creada a mano",
  scheduled: "Programada",
  automation: "Creada por una regla",
  agent: "Programada por un agente",
};

/** Una tarea la ejecuta un agente. `null` (note/call/meeting) NO lo es. */
export function isAgentTask(task: Pick<ActivityDTO, "kind" | "assignee_type">): boolean {
  return task.kind === "task" && task.assignee_type === "agent";
}

export type TaskDisplayState = {
  /** Etiqueta del badge, o `null` si la fila no lleva badge. */
  label: string | null;
  tone: StatusTone;
  /** El badge pinta spinner. */
  transient: boolean;
  /** Razón legible bajo el título, si hay algo que explicar. */
  reason: string | null;
  /** La fila muestra checkbox de completar (solo tareas humanas abiertas). */
  completable: boolean;
};

/**
 * ÚNICO punto que decide qué se pinta en una fila.
 *
 * La regla es que **`task_status` gobierna** y `last_run_status` matiza: una
 * tarea cancelada no dice "En espera" aunque su último intento se difiriera,
 * porque ya no va a intentarlo más. Al revés —dejar mandar al desenlace del
 * motor— produce filas que prometen un reintento que nunca llega.
 */
export function taskDisplayState(
  task: Pick<
    ActivityDTO,
    "kind" | "assignee_type" | "task_status" | "last_run_status" | "last_run_reason"
  >,
): TaskDisplayState {
  const human = { label: null, tone: "neutral" as const, transient: false, reason: null };

  if (!isAgentTask(task)) {
    // Tarea humana: sin badge de ejecución, y con checkbox si sigue abierta.
    return { ...human, completable: task.task_status === "open" };
  }

  // Las de agente NUNCA llevan checkbox: las cierra el agente, no la persona.
  const base = { completable: false };
  const reason = taskRunReasonLabel(task.last_run_reason);

  if (task.task_status === "completed") {
    return { ...base, label: TASK_RUN_STATUS_LABELS.done, tone: "success", transient: false, reason: null };
  }
  if (task.task_status === "cancelled") {
    // Si expiró, el motivo importa: "Cancelada" a secas parece decisión humana.
    return {
      ...base,
      label: task.last_run_reason === "expired" ? TASK_RUN_STATUS_LABELS.failed : "Cancelada",
      tone: task.last_run_reason === "expired" ? "destructive" : "neutral",
      transient: false,
      reason,
    };
  }

  // Abierta: manda el último desenlace del motor. Sin intentos aún, está programada.
  const status: TaskRunStatus = task.last_run_status ?? "scheduled";
  return {
    ...base,
    label: TASK_RUN_STATUS_LABELS[status],
    tone: TASK_RUN_STATUS_TONES[status],
    transient: isTransientRunStatus(status),
    reason,
  };
}

/**
 * Adapta el estado calculado al contrato de `StatusBadge`, que espera una clave
 * y un mapa. La clave es fija porque aquí ya no hay estado que elegir: la
 * decisión la tomó `taskDisplayState()`, y este mapa solo la transporta.
 */
export const TASK_BADGE_KEY = "task";

export function taskBadgeMap(state: TaskDisplayState): StatusMap {
  return {
    [TASK_BADGE_KEY]: {
      label: state.label ?? "",
      tone: state.tone,
      transient: state.transient,
    },
  };
}

/**
 * Una tarea de agente se puede lanzar a mano si sigue abierta y no está
 * corriendo. `run-now` es un bypass del RELOJ, no del anti-spam: el backend
 * vuelve a pasar todos los guards.
 */
export function canRunNow(
  task: Pick<ActivityDTO, "kind" | "assignee_type" | "task_status" | "last_run_status">,
): boolean {
  if (!isAgentTask(task)) return false;
  if (task.task_status !== "open") return false;
  return task.last_run_status !== "running";
}
