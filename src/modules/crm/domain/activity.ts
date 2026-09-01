import type { OffsetQuery, Schemas } from "@/core/api/types";

/**
 * Contratos de actividades y tareas. Una TAREA es una actividad con
 * `kind: task` (+ `due_at` obligatorio): se crea/edita por `/crm/activities`;
 * `/crm/tasks` es solo la bandeja de lectura + complete/reopen/cancel.
 */

export type ActivityDTO = Schemas["ActivityDto"];
export type CreateAgentTaskDTO = Schemas["CreateAgentTaskDto"];
export type UpdateAgentTaskDTO = Schemas["UpdateAgentTaskDto"];
export type CreateActivityDTO = Schemas["CreateActivityDto"];
export type UpdateActivityDTO = Schemas["UpdateActivityDto"];
export type TaskStatsDTO = Schemas["TaskStatsDto"];
export type ActivityKind = ActivityDTO["kind"];
export type TaskStatus = NonNullable<ActivityDTO["task_status"]>;

export type ListActivitiesParams = OffsetQuery & {
  contact_id?: string;
  deal_id?: string;
  kind?: ActivityKind;
};

export type TaskAssigneeFilter = "me" | "unassigned" | (string & {});
export type TaskDueFilter = "overdue" | "today" | "week";

export type ListTasksParams = OffsetQuery & {
  assignee?: TaskAssigneeFilter;
  status?: TaskStatus;
  due?: TaskDueFilter;
  /** Quién la ejecuta. Sin él la bandeja mezcla ambos mundos, que es el
   *  default deliberado: una sola bandeja para el trabajo del equipo. */
  assignee_type?: "user" | "agent";
  agent_id?: string;
  /** Último desenlace del motor: es el filtro de "qué se me está atascando". */
  last_run_status?: NonNullable<ActivityDTO["last_run_status"]>;
};

export const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  note: "Nota",
  call: "Llamada",
  meeting: "Reunión",
  task: "Tarea",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: "Abierta",
  completed: "Completada",
  cancelled: "Cancelada",
};

/**
 * Una tarea abierta con vencimiento en el pasado está vencida.
 *
 * Una tarea de AGENTE en espera NO cuenta como vencida: el rojo de vencimiento
 * significa "alguien no hizo algo", y un diferimiento es el motor esperando su
 * ventana. Pintarlo igual convertiría la operación normal en alarma, que es
 * justo lo que hace que un tenant apague la automatización.
 */
export function isOverdue(
  task: Pick<
    ActivityDTO,
    "task_status" | "due_at" | "kind" | "assignee_type" | "last_run_status"
  >,
  now: Date = new Date(),
): boolean {
  if (task.task_status !== "open" || task.due_at === null) return false;
  if (task.kind === "task" && task.assignee_type === "agent") {
    const pendingRun =
      task.last_run_status === "deferred" ||
      task.last_run_status === "running" ||
      task.last_run_status === "scheduled";
    if (pendingRun) return false;
  }
  const due = new Date(task.due_at).getTime();
  return Number.isFinite(due) && due < now.getTime();
}
