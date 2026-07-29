import type { OffsetQuery, Schemas } from "@/core/api/types";

/**
 * Contratos de actividades y tareas. Una TAREA es una actividad con
 * `kind: task` (+ `due_at` obligatorio): se crea/edita por `/crm/activities`;
 * `/crm/tasks` es solo la bandeja de lectura + complete/reopen/cancel.
 */

export type ActivityDTO = Schemas["ActivityDto"];
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

/** Una tarea abierta con vencimiento en el pasado está vencida. */
export function isOverdue(task: Pick<ActivityDTO, "task_status" | "due_at">, now: Date = new Date()): boolean {
  if (task.task_status !== "open" || task.due_at === null) return false;
  const due = new Date(task.due_at).getTime();
  return Number.isFinite(due) && due < now.getTime();
}
