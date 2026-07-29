import { http } from "@/core/services/http";
import type { Paginated } from "@/core/api/types";
import type {
  ActivityDTO,
  CreateActivityDTO,
  ListActivitiesParams,
  ListTasksParams,
  TaskStatsDTO,
  UpdateActivityDTO,
} from "@/modules/crm/domain/activity";

/**
 * Adapter HTTP de actividades y tareas. ÚNICO punto de creación/edición de
 * tareas (POST/PATCH `/crm/activities` con `kind: task` — no existe
 * POST /crm/tasks). El `kind` es inmutable tras crear.
 */
export function listActivities(
  params: ListActivitiesParams = {},
): Promise<Paginated<ActivityDTO>> {
  return http.get<Paginated<ActivityDTO>>("/crm/activities", params);
}

/** Tarea: exige `due_at`; 422 `crm/invalid_task_fields` si el kind no aplica. */
export function createActivity(dto: CreateActivityDTO): Promise<ActivityDTO> {
  return http.post<ActivityDTO>("/crm/activities", dto);
}

export function updateActivity(id: string, dto: UpdateActivityDTO): Promise<ActivityDTO> {
  return http.patch<ActivityDTO>(`/crm/activities/${id}`, dto);
}

export function deleteActivity(id: string): Promise<void> {
  return http.delete<void>(`/crm/activities/${id}`);
}

/** Bandeja de lectura (`orden due_at asc`); las filas son ActivityDTO. */
export function listTasks(params: ListTasksParams = {}): Promise<Paginated<ActivityDTO>> {
  return http.get<Paginated<ActivityDTO>>("/crm/tasks", params);
}

/** Del solicitante: `{open, overdue, due_today, unassigned}`. */
export function getTaskStats(): Promise<TaskStatsDTO> {
  return http.get<TaskStatsDTO>("/crm/tasks/stats");
}

// Idempotentes; sobre una nota → 409 `crm/not_a_task`.
export function completeTask(id: string): Promise<ActivityDTO> {
  return http.post<ActivityDTO>(`/crm/tasks/${id}/complete`, {});
}

export function reopenTask(id: string): Promise<ActivityDTO> {
  return http.post<ActivityDTO>(`/crm/tasks/${id}/reopen`, {});
}

export function cancelTask(id: string): Promise<ActivityDTO> {
  return http.post<ActivityDTO>(`/crm/tasks/${id}/cancel`, {});
}
